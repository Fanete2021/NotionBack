jest.mock('../../pages-version', () => ({ PagesVersionService: class {} }));

import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { YJS_SAVE_DEBOUNCE_MS } from './yjs.constants';
import { YjsDocService } from './yjs-doc.service';
import { fragmentToJson } from './yjs-json';

const PAGE_ID = 'page-1';

const SEED = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
};

const makeParagraphUpdate = (doc: Y.Doc, text: string): Uint8Array => {
  const before = Y.encodeStateVector(doc);
  const paragraph = new Y.XmlElement('paragraph');
  const xmlText = new Y.XmlText();
  paragraph.insert(0, [xmlText]);
  doc.getXmlFragment('default').push([paragraph]);
  xmlText.insert(0, text);
  return Y.encodeStateAsUpdate(doc, before);
};

describe('YjsDocService', () => {
  let service: YjsDocService;

  const repository = {
    findContent: jest.fn(),
    saveYjsState: jest.fn(),
  };
  const versions = { scheduleAutoSnapshot: jest.fn() };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    repository.saveYjsState.mockResolvedValue(undefined);
    versions.scheduleAutoSnapshot.mockResolvedValue(undefined);
    service = new YjsDocService(repository as never, versions as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('seeds the doc from json and persists the state immediately', async () => {
    repository.findContent.mockResolvedValue({
      pageId: PAGE_ID,
      json: SEED,
      yjsState: null,
    });

    const state = await service.acquire(PAGE_ID);

    const client = new Y.Doc();
    Y.applyUpdate(client, state);
    expect(fragmentToJson(client.getXmlFragment('default'))).toEqual(SEED);
    expect(repository.saveYjsState).toHaveBeenCalledTimes(1);
  });

  it('restores the doc from a stored yjsState', async () => {
    const stored = new Y.Doc();
    makeParagraphUpdate(stored, 'stored');
    repository.findContent.mockResolvedValue({
      pageId: PAGE_ID,
      json: {},
      yjsState: Buffer.from(Y.encodeStateAsUpdate(stored)),
    });

    const state = await service.acquire(PAGE_ID);

    const client = new Y.Doc();
    Y.applyUpdate(client, state);
    expect(
      JSON.stringify(fragmentToJson(client.getXmlFragment('default'))),
    ).toContain('stored');
    expect(repository.saveYjsState).not.toHaveBeenCalled();
  });

  it('merges concurrent edits from two clients without conflicts', async () => {
    repository.findContent.mockResolvedValue(null);

    const initial = await service.acquire(PAGE_ID);
    await service.acquire(PAGE_ID);

    const clientA = new Y.Doc();
    const clientB = new Y.Doc();
    Y.applyUpdate(clientA, initial);
    Y.applyUpdate(clientB, initial);

    const updateA = makeParagraphUpdate(clientA, 'from A');
    const updateB = makeParagraphUpdate(clientB, 'from B');

    service.applyUpdate(PAGE_ID, updateA, 'user-a');
    service.applyUpdate(PAGE_ID, updateB, 'user-b');

    const json = JSON.stringify(service.getLiveJson(PAGE_ID));
    expect(json).toContain('from A');
    expect(json).toContain('from B');
  });

  it('saves after the debounce and schedules an auto snapshot', async () => {
    repository.findContent.mockResolvedValue(null);
    const initial = await service.acquire(PAGE_ID);
    const client = new Y.Doc();
    Y.applyUpdate(client, initial);

    service.applyUpdate(PAGE_ID, makeParagraphUpdate(client, 'x'), 'user-a');
    expect(repository.saveYjsState).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(YJS_SAVE_DEBOUNCE_MS);

    expect(repository.saveYjsState).toHaveBeenCalledTimes(1);
    expect(repository.saveYjsState).toHaveBeenCalledWith(
      PAGE_ID,
      expect.any(Uint8Array),
      expect.objectContaining({ type: 'doc' }),
    );
    expect(versions.scheduleAutoSnapshot).toHaveBeenCalledWith(
      PAGE_ID,
      'user-a',
    );
  });

  it('flushes and unloads the doc when the last client leaves', async () => {
    repository.findContent.mockResolvedValue(null);
    const initial = await service.acquire(PAGE_ID);
    await service.acquire(PAGE_ID);
    const client = new Y.Doc();
    Y.applyUpdate(client, initial);
    service.applyUpdate(PAGE_ID, makeParagraphUpdate(client, 'x'), 'user-a');

    await service.release(PAGE_ID);
    expect(service.isActive(PAGE_ID)).toBe(true);
    expect(repository.saveYjsState).not.toHaveBeenCalled();

    await service.release(PAGE_ID);
    expect(service.isActive(PAGE_ID)).toBe(false);
    expect(repository.saveYjsState).toHaveBeenCalledTimes(1);
  });

  it('keeps the changes dirty when persisting fails', async () => {
    repository.findContent.mockResolvedValue(null);
    const initial = await service.acquire(PAGE_ID);
    const client = new Y.Doc();
    Y.applyUpdate(client, initial);
    service.applyUpdate(PAGE_ID, makeParagraphUpdate(client, 'x'), 'user-a');

    repository.saveYjsState.mockRejectedValueOnce(new Error('db down'));
    await service.flush(PAGE_ID);
    await service.flush(PAGE_ID);

    expect(repository.saveYjsState).toHaveBeenCalledTimes(2);
  });

  describe('replaceContent (version restore)', () => {
    it('replaces the live doc and publishes one update for all clients', async () => {
      repository.findContent.mockResolvedValue(null);
      const initial = await service.acquire(PAGE_ID);
      const client = new Y.Doc();
      Y.applyUpdate(client, initial);
      service.applyUpdate(PAGE_ID, makeParagraphUpdate(client, 'old'), 'u1');

      const published: Uint8Array[] = [];
      service.serverUpdates$.subscribe(({ update }) => published.push(update));

      service.replaceContent(PAGE_ID, SEED);

      expect(service.getLiveJson(PAGE_ID)).toEqual(SEED);
      expect(published).toHaveLength(1);

      // Клиент, применивший обновление, видит тот же документ.
      Y.applyUpdate(client, published[0]);
      expect(fragmentToJson(client.getXmlFragment('default'))).toEqual(SEED);
    });

    it('does nothing for a page without a live session', () => {
      const published = jest.fn();
      service.serverUpdates$.subscribe(published);

      service.replaceContent(PAGE_ID, SEED);

      expect(published).not.toHaveBeenCalled();
    });

    it('registers itself as the live-sync bridge of the versions service', () => {
      const registerLiveSync = jest.fn();
      const bridged = new YjsDocService(
        repository as never,
        {
          ...versions,
          registerLiveSync,
        } as never,
      );

      bridged.onModuleInit();

      expect(registerLiveSync).toHaveBeenCalledWith({
        flush: expect.any(Function) as unknown,
        replace: expect.any(Function) as unknown,
      });
    });
  });

  describe('awareness', () => {
    const makeAwarenessUpdate = (): Uint8Array => {
      const doc = new Y.Doc();
      const awareness = new Awareness(doc);
      awareness.setLocalState({ user: { name: 'A' }, cursor: 3 });
      return encodeAwarenessUpdate(awareness, [doc.clientID]);
    };

    it('stores cursors, hands them to newcomers and removes them on leave', async () => {
      repository.findContent.mockResolvedValue(null);
      await service.acquire(PAGE_ID);
      expect(service.getAwarenessState(PAGE_ID)).toBeNull();

      service.applyAwareness(PAGE_ID, makeAwarenessUpdate(), 'socket-1');
      expect(service.getAwarenessState(PAGE_ID)).not.toBeNull();

      const removal = service.removeAwareness(PAGE_ID, 'socket-1');
      expect(removal).not.toBeNull();
      expect(service.getAwarenessState(PAGE_ID)).toBeNull();
      expect(service.removeAwareness(PAGE_ID, 'socket-1')).toBeNull();
    });

    it('throws for a doc that is not loaded', () => {
      expect(() =>
        service.applyAwareness(PAGE_ID, makeAwarenessUpdate(), 'socket-1'),
      ).toThrow();
    });
  });

  it('throws when applying an update to a doc that is not loaded', () => {
    expect(() =>
      service.applyUpdate(PAGE_ID, new Uint8Array([0]), 'user-a'),
    ).toThrow();
  });
});
