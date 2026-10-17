import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Subject } from 'rxjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import * as Y from 'yjs';
import { PagesVersionService } from '../../pages-version';
import { PagesContentRepository } from '../pages-content.repository';
import { YJS_FRAGMENT_NAME, YJS_SAVE_DEBOUNCE_MS } from './yjs.constants';
import { YjsDocumentTooLargeError } from './yjs-document-too-large.error';
import { fragmentToJson, jsonToFragment } from './yjs-json';

/** Живая сессия документа. У Yjs такого типа нет: счётчик, таймер и курсоры — учёт сервера. */
interface DocEntry {
  doc: Y.Doc;
  awareness: Awareness;
  awarenessOwners: Map<string, Set<number>>;
  refs: number;
  dirty: boolean;
  lastEditorId: string | null;
  /** Точный размер ProseMirror JSON в байтах. */
  jsonBytes: number;
  timer: NodeJS.Timeout | null;
  saving: Promise<void>;
}

@Injectable()
export class YjsDocService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YjsDocService.name);

  private readonly entries = new Map<string, Promise<DocEntry>>();

  private readonly loaded = new Map<string, DocEntry>();

  readonly serverUpdates$ = new Subject<{
    pageId: string;
    update: Uint8Array;
  }>();

  constructor(
    private readonly pagesContentRepository: PagesContentRepository,
    private readonly pagesVersionService: PagesVersionService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.pagesVersionService.registerLiveSync({
      flush: (pageId) => this.flush(pageId),
      replace: (pageId, json) => this.replaceContent(pageId, json),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.loaded.keys()].map((id) => this.flush(id)));
  }

  /** Берёт документ в работу (счётчик ссылок +1) и возвращает его полное состояние. */
  async acquire(pageId: string): Promise<Uint8Array> {
    const entry = await this.getEntry(pageId);
    entry.refs += 1;
    return Y.encodeStateAsUpdate(entry.doc);
  }

  /**
   * Полностью заменяет содержимое живого документа (восстановление версии).
   * Новое yjs-состояние сразу пишется в БД, затем уходит участникам через `serverUpdates$`.
   */
  async replaceContent(
    pageId: string,
    json: Prisma.InputJsonValue,
  ): Promise<void> {
    const entry = this.loaded.get(pageId);
    if (!entry) return;

    let captured: Uint8Array | null = null;
    const onUpdate = (update: Uint8Array): void => {
      captured = captured ? Y.mergeUpdates([captured, update]) : update;
    };

    entry.doc.on('update', onUpdate);
    try {
      entry.doc.transact(() => {
        const fragment = entry.doc.getXmlFragment(YJS_FRAGMENT_NAME);
        fragment.delete(0, fragment.length);
        jsonToFragment(json, fragment);
      });
    } finally {
      entry.doc.off('update', onUpdate);
    }

    // Снимок версии при восстановлении уже создан, второй не нужен.
    // Сохраняем сразу: restore обнуляет yjsState, и пауза дебаунса оставила бы
    // документ, который после рестарта соберётся из json с другими id.
    entry.dirty = true;
    entry.lastEditorId = null;
    entry.jsonBytes = this.measure(entry.doc);
    await this.flush(pageId);
    if (entry.dirty && this.loaded.get(pageId) === entry) {
      this.scheduleSave(pageId, entry);
    }

    if (captured) this.serverUpdates$.next({ pageId, update: captured });
  }

  /** Применяет awareness-обновление сокета (курсоры, выделения). */
  applyAwareness(pageId: string, update: Uint8Array, socketId: string): void {
    const entry = this.loaded.get(pageId);
    if (!entry) {
      throw new Error(`Yjs document for page ${pageId} is not loaded`);
    }

    applyAwarenessUpdate(entry.awareness, update, socketId);
  }

  /** Awareness-состояние всех участников страницы. */
  getAwarenessState(pageId: string): Uint8Array | null {
    const entry = this.loaded.get(pageId);
    if (!entry) return null;

    const clients = [...entry.awareness.getStates().keys()];
    return clients.length > 0
      ? encodeAwarenessUpdate(entry.awareness, clients)
      : null;
  }

  /**
   * Удаляет курсоры сокета и возвращает обновление, которое надо разослать
   * остальным участникам (или null, если у сокета не было состояния).
   */
  removeAwareness(pageId: string, socketId: string): Uint8Array | null {
    const entry = this.loaded.get(pageId);
    const owned = entry?.awarenessOwners.get(socketId);
    if (!entry || !owned || owned.size === 0) return null;

    const clients = [...owned];
    removeAwarenessStates(entry.awareness, clients, 'server');
    entry.awarenessOwners.delete(socketId);

    return encodeAwarenessUpdate(entry.awareness, clients);
  }

  /** Текущее полное состояние документа без изменения счётчика ссылок. */
  async getState(pageId: string): Promise<Uint8Array> {
    const entry = await this.getEntry(pageId);
    return Y.encodeStateAsUpdate(entry.doc);
  }

  /** Освобождает документ; при отсутствии подписчиков сохраняет и выгружает из памяти. */
  async release(pageId: string): Promise<void> {
    const entry = this.loaded.get(pageId);
    if (!entry) return;

    entry.refs = Math.max(0, entry.refs - 1);
    if (entry.refs > 0) return;

    await this.flush(pageId);
    this.unloadIfIdle(pageId, entry);
  }

  applyUpdate(pageId: string, update: Uint8Array, editorId: string): void {
    const entry = this.loaded.get(pageId);
    if (!entry) {
      throw new Error(`Yjs document for page ${pageId} is not loaded`);
    }

    const nextBytes = this.projectedJsonBytes(entry, update);
    if (nextBytes === null) throw new YjsDocumentTooLargeError();

    Y.applyUpdate(entry.doc, update);

    entry.jsonBytes = nextBytes;
    entry.dirty = true;
    entry.lastEditorId = editorId;
    this.scheduleSave(pageId, entry);
  }

  /** Есть ли у страницы живая Yjs-сессия в памяти. */
  isActive(pageId: string): boolean {
    return this.loaded.has(pageId);
  }

  /** Актуальный ProseMirror JSON живого документа (в БД он может отставать до дебаунса). */
  getLiveJson(pageId: string): Prisma.InputJsonValue | null {
    const entry = this.loaded.get(pageId);
    if (!entry) return null;
    return fragmentToJson(
      entry.doc.getXmlFragment(YJS_FRAGMENT_NAME),
    ) as unknown as Prisma.InputJsonValue;
  }

  async flush(pageId: string): Promise<void> {
    const entry = this.loaded.get(pageId);
    if (!entry) return;

    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }

    // Сохранения выполняются строго по очереди.
    entry.saving = entry.saving.then(() => this.persist(pageId, entry));
    await entry.saving;
  }

  private getEntry(pageId: string): Promise<DocEntry> {
    let pending = this.entries.get(pageId);
    if (!pending) {
      pending = this.load(pageId);
      this.entries.set(pageId, pending);
      pending.catch(() => this.entries.delete(pageId));
    }
    return pending;
  }

  private async load(pageId: string): Promise<DocEntry> {
    const content = await this.pagesContentRepository.findContent(pageId);
    const doc = new Y.Doc();
    let seededFromJson = false;

    if (content?.yjsState) {
      Y.applyUpdate(doc, new Uint8Array(content.yjsState));
    } else if (content) {
      jsonToFragment(content.json, doc.getXmlFragment(YJS_FRAGMENT_NAME));
      seededFromJson = doc.getXmlFragment(YJS_FRAGMENT_NAME).length > 0;
    }

    const awareness = new Awareness(doc);
    // Сервер сам не участник: убираем его собственное состояние.
    awareness.setLocalState(null);

    const awarenessOwners = new Map<string, Set<number>>();
    awareness.on(
      'update',
      (
        changes: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
      ) => {
        if (typeof origin !== 'string' || origin === 'server') return;

        const owned = awarenessOwners.get(origin) ?? new Set<number>();
        for (const id of [...changes.added, ...changes.updated]) owned.add(id);
        for (const id of changes.removed) owned.delete(id);
        awarenessOwners.set(origin, owned);
      },
    );

    const entry: DocEntry = {
      doc,
      awareness,
      awarenessOwners,
      refs: 0,
      // Состояние, собранное из json, надо сразу сохранить: иначе после
      // выгрузки документ пересоздастся с другими идентификаторами элементов,
      // и клиенты, уже получившие старое состояние, продублируют содержимое.
      dirty: seededFromJson,
      lastEditorId: null,
      jsonBytes: this.measure(doc),
      timer: null,
      saving: Promise.resolve(),
    };

    if (seededFromJson) await this.persist(pageId, entry);

    this.loaded.set(pageId, entry);
    return entry;
  }

  private scheduleSave(pageId: string, entry: DocEntry): void {
    if (entry.timer) clearTimeout(entry.timer);

    entry.timer = setTimeout(() => {
      entry.timer = null;
      void this.persistAndUnload(pageId);
    }, YJS_SAVE_DEBOUNCE_MS);
  }

  private async persistAndUnload(pageId: string): Promise<void> {
    const entry = this.loaded.get(pageId);
    if (!entry) return;

    await this.flush(pageId);
    this.unloadIfIdle(pageId, entry);
  }

  /**
   * Выгружает документ только когда правок больше нет и никто его не держит.
   * Если запись в БД не удалась, документ остаётся в памяти и сохранение повторяется.
   */
  private unloadIfIdle(pageId: string, entry: DocEntry): void {
    if (this.loaded.get(pageId) !== entry) return;

    if (entry.dirty) {
      if (!entry.timer) this.scheduleSave(pageId, entry);
      return;
    }
    if (entry.refs > 0) return;

    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    entry.awareness.destroy();
    entry.doc.destroy();
    this.loaded.delete(pageId);
    this.entries.delete(pageId);
  }

  private async persist(pageId: string, entry: DocEntry): Promise<void> {
    if (!entry.dirty) return;

    const editorId = entry.lastEditorId;
    entry.dirty = false;

    try {
      const state = Y.encodeStateAsUpdate(entry.doc);
      const json = fragmentToJson(
        entry.doc.getXmlFragment(YJS_FRAGMENT_NAME),
      ) as unknown as Prisma.InputJsonValue;

      await this.pagesContentRepository.saveYjsState(
        pageId,
        new Uint8Array(state),
        json,
        editorId,
      );
      entry.jsonBytes = Buffer.byteLength(JSON.stringify(json), 'utf8');
    } catch (error) {
      // Не теряем правки: при следующем flush попробуем снова.
      entry.dirty = true;
      this.logger.error(
        `Failed to persist Yjs state for page ${pageId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    if (!editorId) return;

    try {
      await this.pagesVersionService.scheduleAutoSnapshot(pageId, editorId);
    } catch (error) {
      // Документ уже в БД. Ошибка очереди снимков не должна помечать его грязным
      // и перезаписывать одно и то же каждые 3 секунды.
      this.logger.error(
        `Failed to schedule auto snapshot for page ${pageId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private maxContentBytes(): number {
    return this.configService.get<number>('MAX_PAGE_CONTENT_BYTES', 1048576);
  }

  private measure(doc: Y.Doc): number {
    const json = fragmentToJson(doc.getXmlFragment(YJS_FRAGMENT_NAME));
    return Buffer.byteLength(JSON.stringify(json), 'utf8');
  }

  /**
   * Точный размер JSON после обновления.
   * `null` — правка растит документ сверх лимита и её нельзя применять.
   * Считаем по копии: бинарный апдейт бывает меньше, чем прирост JSON.
   */
  private projectedJsonBytes(
    entry: DocEntry,
    update: Uint8Array,
  ): number | null {
    const limit = this.maxContentBytes();
    const pending = new Y.Doc();
    try {
      Y.applyUpdate(pending, Y.encodeStateAsUpdate(entry.doc));
      const before = this.measure(pending);
      Y.applyUpdate(pending, update);
      const after = this.measure(pending);
      if (after > limit && after > before) return null;
      return after;
    } finally {
      pending.destroy();
    }
  }
}
