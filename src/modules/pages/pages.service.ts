import { ProjectsRepository } from '@modules/projects/projects.repository';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Page, PageType, Prisma } from '@prisma/client';
import { S3ObjectService } from '@modules/s3';
import { DAY_IN_MS } from './constants';
import {
  CreatePageDto,
  PageSearchType,
  SEARCH_DEFAULT_LIMIT,
  SearchPagesQueryDto,
  UpdatePageDto,
} from './dto';
import {
  PageEntity,
  PageSearchResultEntity,
  TrashedPageEntity,
} from './entities';
import { PagesMapper } from './pages.mapper';
import { PagesRepository } from './pages.repository';

@Injectable()
export class PagesService {
  constructor(
    private readonly pagesRepository: PagesRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly pagesMapper: PagesMapper,
    private readonly s3ObjectService: S3ObjectService,
    @InjectPinoLogger(PagesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(
    workspaceId: string,
    authorId: string,
    dto: CreatePageDto,
  ): Promise<PageEntity> {
    await this.assertProjectInWorkspace(workspaceId, dto.projectId);

    const page = await this.pagesRepository.create(workspaceId, authorId, {
      projectId: dto.projectId,
      title: dto.title,
      icon: dto.icon ?? null,
      type: dto.type ?? 'DOC',
    });

    this.logger.info(
      { pageId: page.id, workspaceId, userId: authorId, action: 'page_create' },
      'page created',
    );

    return page;
  }

  async findAllByWorkspaceId(
    workspaceId: string,
    projectId?: string,
  ): Promise<PageEntity[]> {
    return this.pagesRepository.findAllByWorkspaceId(workspaceId, projectId);
  }

  async search(
    workspaceId: string,
    query: SearchPagesQueryDto,
  ): Promise<PageSearchResultEntity[]> {
    if (query.projectId) {
      await this.assertProjectInWorkspace(workspaceId, query.projectId);
    }

    const type = query.type ?? PageSearchType.ALL;
    const rows = await this.pagesRepository.search(workspaceId, {
      q: query.q,
      type,
      projectId: query.projectId,
      limit: query.limit ?? SEARCH_DEFAULT_LIMIT,
    });

    return rows.map((row) => {
      const matchedInTitle =
        type === PageSearchType.DOCUMENTS ||
        (type === PageSearchType.ALL && row.titleMatch);
      const hasContentMatch = !matchedInTitle && row.pos > 0;

      return new PageSearchResultEntity({
        pageId: row.id,
        workspaceId: row.workspaceId,
        projectId: row.projectId,
        parentPageId: row.parentPageId,
        title: row.title,
        icon: row.icon,
        type: row.type as PageType,
        matchedIn: matchedInTitle ? 'title' : 'content',
        snippet: hasContentMatch ? row.snippet : null,
        matchOffset: hasContentMatch ? row.pos - 1 : null,
        updatedAt: row.updatedAt,
      });
    });
  }

  async reorder(
    workspaceId: string,
    projectId: string,
    orderedIds: string[],
  ): Promise<PageEntity[]> {
    await this.assertProjectInWorkspace(workspaceId, projectId);

    const pages = await this.pagesRepository.reorder(
      workspaceId,
      projectId,
      orderedIds,
    );

    if (!pages) {
      throw new BadRequestException(
        'orderedIds должен содержать ровно все документы-соседи проекта',
      );
    }

    return pages;
  }

  async findById(id: string): Promise<PageEntity> {
    const page = await this.pagesRepository.findById(id);
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  async update(page: PageEntity, dto: UpdatePageDto): Promise<PageEntity> {
    const payload: Prisma.PageUncheckedUpdateInput = {
      title: dto.title,
      icon: dto.icon,
      type: dto.type,
    };

    if (dto.projectId !== undefined && dto.projectId !== page.projectId) {
      await this.assertProjectInWorkspace(page.workspaceId, dto.projectId);
      payload.projectId = dto.projectId;
      payload.position = await this.pagesRepository.nextPosition(
        page.workspaceId,
        dto.projectId,
      );
    }

    const updated = await this.pagesRepository.update(page.id, payload);
    if (!updated) {
      throw new NotFoundException('Page not found');
    }

    this.logger.info(
      { pageId: page.id, workspaceId: page.workspaceId, action: 'page_update' },
      'page updated',
    );

    return updated;
  }

  async delete(page: PageEntity, userId: string): Promise<void> {
    const deleted = await this.pagesRepository.softDelete(page.id, userId);
    if (!deleted) {
      throw new NotFoundException('Page not found');
    }

    this.logger.info(
      {
        pageId: page.id,
        workspaceId: page.workspaceId,
        userId,
        action: 'page_delete',
      },
      'page moved to trash',
    );
  }

  async findTrash(
    workspaceId: string,
    search?: string,
  ): Promise<TrashedPageEntity[]> {
    const pages = await this.pagesRepository.findTrashedByWorkspaceId(
      workspaceId,
      search,
    );

    return pages.map((page) => this.pagesMapper.toTrashedEntity(page));
  }

  async findDeletableById(id: string): Promise<PageEntity> {
    const page = await this.pagesRepository.findByIdIncludingDeleted(id);
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    return this.pagesMapper.toEntity(page);
  }

  async restore(page: PageEntity): Promise<PageEntity> {
    const restored = await this.pagesRepository.restore(page.id);
    if (!restored) {
      throw new NotFoundException('Page not found in trash');
    }

    this.logger.info(
      {
        pageId: page.id,
        workspaceId: page.workspaceId,
        action: 'page_restore',
      },
      'page restored from trash',
    );

    return restored;
  }

  async hardDelete(page: PageEntity): Promise<void> {
    await this.deleteAttachmentObjects(page.id, page.workspaceId);

    const deleted = await this.pagesRepository.hardDelete(page.id);
    if (!deleted) {
      throw new NotFoundException('Page not found');
    }

    this.logger.info(
      {
        pageId: page.id,
        workspaceId: page.workspaceId,
        action: 'page_hard_delete',
      },
      'page permanently deleted',
    );
  }

  async emptyTrash(workspaceId: string): Promise<number> {
    const trashed = await this.pagesRepository.findTrashedForPurge(workspaceId);

    let deletedCount = 0;
    for (const page of trashed) {
      if (await this.tryHardDelete(page)) {
        deletedCount += 1;
      }
    }

    this.logger.info(
      {
        action: 'page_trash_empty',
        workspaceId,
        deletedCount,
        found: trashed.length,
      },
      'workspace trash emptied',
    );

    return deletedCount;
  }

  async hardDeleteExpired(retentionDays: number): Promise<number> {
    const threshold = new Date(Date.now() - retentionDays * DAY_IN_MS);
    const expired = await this.pagesRepository.findExpiredTrashed(threshold);

    let deletedCount = 0;
    for (const page of expired) {
      if (await this.tryHardDelete(page)) {
        deletedCount += 1;
      }
    }

    this.logger.info(
      { action: 'page_trash_cleanup', deletedCount, found: expired.length },
      'expired trash cleaned up',
    );

    return deletedCount;
  }

  private async tryHardDelete(page: Page): Promise<boolean> {
    try {
      await this.deleteAttachmentObjects(page.id, page.workspaceId);
      await this.pagesRepository.hardDelete(page.id);
      return true;
    } catch (error: unknown) {
      this.logger.error(
        {
          pageId: page.id,
          workspaceId: page.workspaceId,
          action: 'page_hard_delete',
          err: error,
        },
        'failed to hard-delete page',
      );
      return false;
    }
  }

  private async deleteAttachmentObjects(
    pageId: string,
    workspaceId: string,
  ): Promise<void> {
    const keys = await this.pagesRepository.findAttachmentKeys(pageId);

    for (const key of keys) {
      try {
        await this.s3ObjectService.deleteObject(key);
      } catch (error: unknown) {
        this.logger.error(
          {
            pageId,
            workspaceId,
            key,
            action: 'page_attachment_delete',
            err: error,
          },
          'failed to delete page attachment from storage',
        );
        throw error;
      }
    }
  }

  private async assertProjectInWorkspace(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.workspaceId !== workspaceId) {
      throw new BadRequestException(
        'Project not found or not in the same workspace',
      );
    }
  }
}
