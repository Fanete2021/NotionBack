import { Injectable } from '@nestjs/common';
import { Page, PageContent, PageType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PageEntity } from './entities/page.entity';
import { PageContentEntity } from './entities/page-content.entity';

export const EMPTY_DOCUMENT: Prisma.InputJsonValue = {
  type: 'doc',
  content: [],
};

export type CreatePageData = {
  projectId: string;
  title: string;
  icon: string | null;
  coverUrl: string | null;
  type: PageType;
};

@Injectable()
export class PagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    authorId: string,
    data: CreatePageData,
  ): Promise<PageEntity> {
    const page = await this.prisma.$transaction(async (tx) => {
      const { _max } = await tx.page.aggregate({
        where: {
          workspaceId,
          projectId: data.projectId,
          parentPageId: null,
        },
        _max: { position: true },
      });

      const position = (_max.position ?? -1) + 1;

      const created = await tx.page.create({
        data: {
          workspaceId,
          authorId,
          projectId: data.projectId,
          title: data.title,
          icon: data.icon,
          coverUrl: data.coverUrl,
          type: data.type,
          position,
        },
      });

      await tx.pageContent.create({
        data: { pageId: created.id, json: EMPTY_DOCUMENT },
      });

      return created;
    });

    return this.mapToEntity(page);
  }

  async nextPosition(workspaceId: string, projectId: string): Promise<number> {
    const { _max } = await this.prisma.page.aggregate({
      where: {
        workspaceId,
        projectId,
        parentPageId: null,
      },
      _max: { position: true },
    });

    return (_max.position ?? -1) + 1;
  }

  async findAllByWorkspaceId(
    workspaceId: string,
    projectId?: string,
  ): Promise<PageEntity[]> {
    const pages = await this.prisma.page.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { position: 'asc' },
    });

    return pages.map((page) => this.mapToEntity(page));
  }

  async findById(id: string): Promise<PageEntity | null> {
    const page = await this.prisma.page.findUnique({
      where: { id, deletedAt: null },
    });

    if (!page) {
      return null;
    }

    return this.mapToEntity(page);
  }

  async update(
    id: string,
    data: Prisma.PageUncheckedUpdateInput,
  ): Promise<PageEntity | null> {
    const page = await this.prisma.page
      .update({
        where: { id, deletedAt: null },
        data,
      })
      .catch((error) => {
        if (this.isNotFoundError(error)) {
          return null;
        }
        throw error;
      });

    return page ? this.mapToEntity(page) : null;
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      await this.prisma.page.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async findContent(pageId: string): Promise<PageContentEntity | null> {
    const content = await this.prisma.pageContent.findUnique({
      where: { pageId },
    });

    if (!content) {
      return null;
    }

    return this.mapContentToEntity(content);
  }

  async upsertContent(
    pageId: string,
    json: Prisma.InputJsonValue,
  ): Promise<PageContentEntity> {
    const content = await this.prisma.pageContent.upsert({
      where: { pageId },
      create: { pageId, json },
      update: { json },
    });

    return this.mapContentToEntity(content);
  }

  private isNotFoundError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }

  private mapToEntity(page: Page): PageEntity {
    return new PageEntity(
      page.id,
      page.workspaceId,
      page.projectId,
      page.title,
      page.icon,
      page.coverUrl,
      page.type,
      page.authorId,
      page.position,
      page.createdAt,
      page.updatedAt,
    );
  }

  private mapContentToEntity(content: PageContent): PageContentEntity {
    return new PageContentEntity(
      content.pageId,
      content.json,
      content.updatedAt,
    );
  }
}
