import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { EMPTY_DOCUMENT } from '../constants';
import { PageEntity } from '../entities/page.entity';
import { PagesVersionService } from '../pages-version';
import { PageContentEntity } from './entities';
import { PagesContentRepository } from './pages-content.repository';

@Injectable()
export class PagesContentService {
  constructor(
    private readonly pagesContentRepository: PagesContentRepository,
    private readonly configService: ConfigService,
    private readonly pagesVersionService: PagesVersionService,
  ) {}

  async getContent(page: PageEntity): Promise<PageContentEntity> {
    const content = await this.pagesContentRepository.findContent(page.id);
    if (!content) {
      return new PageContentEntity(
        page.id,
        EMPTY_DOCUMENT as Prisma.JsonValue,
        new Date(),
      );
    }

    return content;
  }

  async updateContent(
    page: PageEntity,
    json: unknown,
  ): Promise<PageContentEntity> {
    if (json === null || json === undefined) {
      throw new BadRequestException('Page content must be a JSON value');
    }

    if (typeof json !== 'object' || Array.isArray(json)) {
      throw new BadRequestException('Page content must be a JSON object');
    }

    this.assertSizeWithinLimit(json);

    const updatedContent = this.pagesContentRepository.upsertContent(
      page.id,
      json,
    );

    await this.pagesVersionService.scheduleAutoSnapshot(page.id, page.authorId);

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
