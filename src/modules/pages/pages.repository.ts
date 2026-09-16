import { Injectable } from '@nestjs/common';
import { Page, PageContent, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { PageEntity } from '@modules/pages/entities';
import { PageContentEntity } from '@modules/pages/entities';
import { EMPTY_DOCUMENT } from '@modules/pages/constants';
import { CreatePageData } from '@modules/pages/types';
import { isNotFoundError } from '@common/utils';

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

  async reorder(
    workspaceId: string,
    projectId: string,
    orderedIds: string[],
  ): Promise<PageEntity[] | null> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockSiblingGroup(tx, workspaceId, projectId);

      const siblings = await tx.page.findMany({
        where: {
          workspaceId,
          projectId,
          parentPageId: null,
          deletedAt: null,
        },
      });

      const siblingIds = siblings.map((page) => page.id);
      if (!this.isExactPermutation(orderedIds, siblingIds)) {
        return null;
      }

      if (orderedIds.length > 0) {
        await tx.page.updateMany({
          where: { id: { in: orderedIds } },
          data: { position: { increment: orderedIds.length } },
        });

        for (const [index, id] of orderedIds.entries()) {
          await tx.page.update({
            where: { id },
            data: { position: index },
          });
        }
      }

      const pages = await tx.page.findMany({
        where: {
          workspaceId,
          projectId,
          parentPageId: null,
          deletedAt: null,
        },
        orderBy: { position: 'asc' },
      });

      return pages.map((page) => this.mapToEntity(page));
    });
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
        if (isNotFoundError(error)) {
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
      if (isNotFoundError(error)) {
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

  private isExactPermutation(
    orderedIds: string[],
    siblingIds: string[],
  ): boolean {
    if (orderedIds.length !== siblingIds.length) {
      return false;
    }

    const orderedSet = new Set(orderedIds);
    return siblingIds.every((id) => orderedSet.has(id));
  }

  private lockSiblingGroup(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    projectId: string,
  ): Promise<unknown> {
    return tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${workspaceId}),
        hashtext(${`page:${projectId}`})
      )
    `;
  }

  private mapToEntity(page: Page): PageEntity {
    return new PageEntity(
      page.id,
      page.workspaceId,
      page.projectId,
      page.parentPageId,
      page.title,
      page.icon,
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
