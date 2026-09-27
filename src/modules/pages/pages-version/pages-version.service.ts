import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PageVersion, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AUTO_SNAPSHOT_DELAY, PAGE_VERSIONS_DEFAULT_LIMIT } from './consts';
import { ListPageVersionsQueryDto } from './dto';
import { PagesVersionRepository } from './pages-version.repository';
import { PageContentHead, PageVersionPage } from './types';

@Injectable()
export class PagesVersionService {
  constructor(
    @InjectQueue('page-versions') private readonly queue: Queue,
    private readonly pagesVersionRepository: PagesVersionRepository,
    @InjectPinoLogger(PagesVersionService.name)
    private readonly logger: PinoLogger,
  ) {}

  async scheduleAutoSnapshot(pageId: string, authorId: string): Promise<void> {
    const jobId = `auto-snapshot-${pageId}`;

    await this.queue.add(
      'auto-snapshot',
      { pageId, authorId },
      {
        jobId,
        delay: AUTO_SNAPSHOT_DELAY,
      },
    );

    this.logger.debug(
      { action: 'page_autosnapshot_schedule', pageId, userId: authorId },
      'auto snapshot scheduled',
    );
  }

  async findById(id: string): Promise<PageVersion> {
    const version = await this.pagesVersionRepository.findById(id);
    if (!version) {
      throw new NotFoundException('Page version not found');
    }
    return version;
  }

  async list(
    pageId: string,
    query: ListPageVersionsQueryDto,
  ): Promise<PageVersionPage> {
    const limit = query.limit ?? PAGE_VERSIONS_DEFAULT_LIMIT;
    const rows = await this.pagesVersionRepository.findManyByPageId(pageId, {
      cursor: query.cursor,
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async restore(
    version: PageVersion,
    authorId: string,
  ): Promise<PageContentHead> {
    const nextJson = toInputJson(version.snapshot);
    const restored = await this.pagesVersionRepository.restore({
      pageId: version.pageId,
      authorId,
      label: new Date().toISOString(),
      nextJson,
    });

    if (restored.changed) {
      this.logger.info(
        {
          action: 'page_version_restore',
          pageId: version.pageId,
          versionId: version.id,
          userId: authorId,
        },
        'page version restored',
      );
    }

    return restored.content;
  }
}

function toInputJson(value: Prisma.JsonValue): Prisma.InputJsonValue {
  if (value === null) {
    throw new BadRequestException('Version snapshot is empty');
  }

  return value;
}
