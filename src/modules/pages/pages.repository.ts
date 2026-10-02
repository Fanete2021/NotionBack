import { isNotFoundError } from '@common/utils';
import { Injectable } from '@nestjs/common';
import { Page, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { EMPTY_DOCUMENT } from './constants';
import { PageSearchType } from './dto/search-pages-query.dto';
import { PageEntity } from './entities';
import { CreatePageData, TrashedPageRow, USER_REF_SELECT } from './types';

const SNIPPET_RADIUS = 80;

export interface PageSearchRow {
  id: string;
  workspaceId: string;
  projectId: string | null;
  parentPageId: string | null;
  title: string;
  icon: string | null;
  type: string;
  updatedAt: Date;
  titleMatch: boolean;
  pos: number;
  snippet: string | null;
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

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

    return page;
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

      return pages.map((page) => PageEntity.fromModel(page));
    });
  }

  async findAllByWorkspaceId(
    workspaceId: string,
    projectId?: string,
  ): Promise<PageEntity[]> {
    return this.prisma.page.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { position: 'asc' },
    });
  }

  async findById<T extends Prisma.PageInclude>(
    id: string,
    include?: T,
  ): Promise<Prisma.PageGetPayload<{ include: T }> | null> {
    const page = await this.prisma.page.findUnique({
      where: { id, deletedAt: null },
      include,
    });

    if (!page) {
      return null;
    }

    return page as Prisma.PageGetPayload<{ include: T }>;
  }

  async findByIdIncludingDeleted(id: string): Promise<Page | null> {
    return this.prisma.page.findUnique({ where: { id } });
  }

  async findTrashedByWorkspaceId(
    workspaceId: string,
    search?: string,
  ): Promise<TrashedPageRow[]> {
    const where: Prisma.PageWhereInput = {
      workspaceId,
      deletedAt: { not: null },
    };

    const filter = this.buildTrashSearchFilter(search);
    if (filter) {
      where.OR = filter;
    }

    return this.prisma.page.findMany({
      where,
      include: {
        author: { select: USER_REF_SELECT },
        deletedByUser: { select: USER_REF_SELECT },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findExpiredTrashed(before: Date): Promise<Page[]> {
    return this.prisma.page.findMany({
      where: {
        deletedAt: { not: null, lt: before },
      },
    });
  }

  async findTrashedForPurge(workspaceId: string): Promise<Page[]> {
    return this.prisma.page.findMany({
      where: {
        workspaceId,
        deletedAt: { not: null },
      },
    });
  }

  async findAttachmentKeys(pageId: string): Promise<string[]> {
    const attachments = await this.prisma.attachment.findMany({
      where: { pageId },
      select: { key: true },
    });

    return attachments.map((attachment) => attachment.key);
  }

  async restore(id: string): Promise<PageEntity | null> {
    try {
      return await this.prisma.page.update({
        where: { id, deletedAt: { not: null } },
        data: { deletedAt: null, deletedBy: null },
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async hardDelete(id: string): Promise<boolean> {
    try {
      await this.prisma.page.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
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

    return page;
  }

  async softDelete(id: string, deletedBy: string): Promise<boolean> {
    try {
      await this.prisma.page.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy },
      });
      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async search(
    workspaceId: string,
    params: {
      q: string;
      type: PageSearchType;
      projectId?: string;
      limit: number;
    },
  ): Promise<PageSearchRow[]> {
    const { q, type, projectId, limit } = params;
    const pattern = `%${escapeLikePattern(q)}%`;

    const titleCond = Prisma.sql`p.title ILIKE ${pattern} ESCAPE '\\'`;
    const contentCond = Prisma.sql`pc."searchText" ILIKE ${pattern} ESCAPE '\\'`;
    const matchCond =
      type === PageSearchType.DOCUMENTS
        ? titleCond
        : type === PageSearchType.CONTENT
          ? contentCond
          : Prisma.sql`(${titleCond} OR ${contentCond})`;
    const projectCond = projectId
      ? Prisma.sql`AND p."projectId" = ${projectId}`
      : Prisma.empty;

    return this.prisma.$queryRaw<PageSearchRow[]>`
      SELECT
        id, "workspaceId", "projectId", "parentPageId", title, icon, type,
        "updatedAt", "titleMatch", pos,
        CASE WHEN pos > 0
          THEN substr("searchText", GREATEST(pos - ${SNIPPET_RADIUS}, 1), ${SNIPPET_RADIUS * 2 + q.length})
          ELSE NULL
        END AS snippet
      FROM (
        SELECT
          p.id, p."workspaceId", p."projectId", p."parentPageId", p.title,
          p.icon, p.type::text AS type, p."updatedAt",
          (${titleCond}) AS "titleMatch",
          position(lower(${q}) in lower(COALESCE(pc."searchText", ''))) AS pos,
          COALESCE(pc."searchText", '') AS "searchText"
        FROM pages p
        LEFT JOIN page_contents pc ON pc."pageId" = p.id
        WHERE p."workspaceId" = ${workspaceId}
          AND p."deletedAt" IS NULL
          ${projectCond}
          AND ${matchCond}
      ) r
      ORDER BY "titleMatch" DESC, "updatedAt" DESC
      LIMIT ${limit}
    `;
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

  private buildTrashSearchFilter(
    search?: string,
  ): Prisma.PageWhereInput[] | null {
    const query = search?.trim();
    if (!query) {
      return null;
    }

    const contains: Prisma.StringFilter = {
      contains: query,
      mode: 'insensitive',
    };

    return [
      { title: contains },
      { project: { is: { name: contains } } },
      { deletedByUser: { is: { name: contains } } },
      { deletedByUser: { is: { email: contains } } },
    ];
  }
}
