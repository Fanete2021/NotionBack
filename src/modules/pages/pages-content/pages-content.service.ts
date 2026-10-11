import {
  BadRequestException,
  ConflictException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { EMPTY_DOCUMENT } from '../constants';
import { PageEntity } from '../entities/page.entity';
import { PagesVersionService } from '../pages-version';
import { PagesContentRepository } from './pages-content.repository';
import { YjsDocService } from './yjs';

@Injectable()
export class PagesContentService {
  constructor(
    private readonly pagesContentRepository: PagesContentRepository,
    private readonly configService: ConfigService,
    private readonly pagesVersionService: PagesVersionService,
    private readonly yjsDocService: YjsDocService,
  ) {}

  async getContent(page: PageEntity) {
    // Пока страницу правят через Yjs, актуальный документ живёт в памяти,
    // а в БД он отстаёт на время дебаунса.
    const liveJson = this.yjsDocService.getLiveJson(page.id);
    if (liveJson) {
      return {
        pageId: page.id,
        json: liveJson as Prisma.JsonValue,
        yjsState: null,
        updatedAt: new Date(),
      };
    }

    const content = await this.pagesContentRepository.findContent(page.id);
    if (!content) {
      return {
        pageId: page.id,
        json: EMPTY_DOCUMENT as Prisma.JsonValue,
        yjsState: null,
        updatedAt: new Date(),
      };
    }
    return content;
  }

  async updateContent(page: PageEntity, json: unknown, editorId: string) {
    if (json === null || json === undefined) {
      throw new BadRequestException('Page content must be a JSON value');
    }

    if (typeof json !== 'object' || Array.isArray(json)) {
      throw new BadRequestException('Page content must be a JSON object');
    }

    // Запись целиком затёрла бы чужие realtime-правки: во время Yjs-сессии
    // документ меняется только через сокет.
    if (this.yjsDocService.isActive(page.id)) {
      throw new ConflictException(
        'Page is being edited in real time, use the websocket channel',
      );
    }

    this.assertSizeWithinLimit(json);

    const updatedContent = await this.pagesContentRepository.upsertContent(
      page.id,
      json,
    );

    await this.pagesVersionService.scheduleAutoSnapshot(page.id, editorId);

    return updatedContent;
  }

  private assertSizeWithinLimit(json: unknown): void {
    const maxBytes = this.configService.get<number>(
      'MAX_PAGE_CONTENT_BYTES',
      1048576,
    );
    const size = Buffer.byteLength(JSON.stringify(json), 'utf8');

    if (size > maxBytes) {
      throw new PayloadTooLargeException(
        `Page content exceeds the size limit of ${maxBytes} bytes`,
      );
    }
  }
}
