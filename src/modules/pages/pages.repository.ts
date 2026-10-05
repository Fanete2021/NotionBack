import { isNotFoundError } from '@common/utils';
import { Injectable } from '@nestjs/common';
import { Page, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { EMPTY_DOCUMENT } from './constants';
import { PageSearchType } from './dto/search-pages-query.dto';
import { PageEntity, PageSearchPathItemEntity } from './entities';
import { CreatePageData, TrashedPageRow, USER_REF_SELECT } from './types';

const SNIPPET_RADIUS = 80;

export interface PageSearchParams {
  q: string;
  type: PageSearchType;
  projectId?: string;
  from?: Date;
  to?: Date;
  limit: number;
}

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
  path: PageSearchPathItemEntity[];
}

interface PageSearchChainRow {
  leafId: string;
  id: string;
  parentPageId: string | null;
  projectId: string | null;
  title: string;
  depth: number;
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
        data: {
          pageId: created.id,
          workspaceId,
          json: EMPTY_DOCUMENT,
          searchText: '',
        },
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
    params: PageSearchParams,
  ): Promise<PageSearchRow[]> {
    const { q, type, projectId, from, to, limit } = params;
    const pattern = `%${escapeLikePattern(q)}%`;

    const titleCond = Prisma.sql`p.title ILIKE ${pattern} ESCAPE '\\'`;
    const contentCond = Prisma.sql`pc."searchText" ILIKE ${pattern} ESCAPE '\\'`;
    const condByType: Partial<Record<PageSearchType, Prisma.Sql>> = {
      [PageSearchType.DOCUMENTS]: titleCond,
      [PageSearchType.CONTENT]: contentCond,
    };
    const matchCond =
      condByType[type] ?? Prisma.sql`(${titleCond} OR ${contentCond})`;
    const projectCond = projectId
      ? Prisma.sql`AND p."projectId" = ${projectId}`
      : Prisma.empty;
    const fromCond = from
      ? Prisma.sql`AND p."updatedAt" >= ${from}`
      : Prisma.empty;
    const toCond = to ? Prisma.sql`AND p."updatedAt" <= ${to}` : Prisma.empty;
    const orderBy =
      type === PageSearchType.CONTENT
        ? Prisma.sql`ORDER BY "updatedAt" DESC`
        : Prisma.sql`ORDER BY "titleMatch" DESC, "updatedAt" DESC`;

    const rows = await this.prisma.$queryRaw<Omit<PageSearchRow, 'path'>[]>`
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
        LEFT JOIN page_contents pc
          ON pc."pageId" = p.id AND pc."workspaceId" = ${workspaceId}
        WHERE p."workspaceId" = ${workspaceId}
          AND p."deletedAt" IS NULL
          ${projectCond}
          ${fromCond}
          ${toCond}
          AND ${matchCond}
      ) r
      ${orderBy}
      LIMIT ${limit}
    `;

    const paths = await this.resolveSearchPaths(rows);
    return rows.map((row) => ({
      ...row,
      path: paths.get(row.id) ?? [],
    }));
  }

  private async resolveSearchPaths(
    rows: Array<Pick<PageSearchRow, 'id' | 'projectId'>>,
  ): Promise<Map<string, PageSearchPathItemEntity[]>> {
    const paths = new Map<string, PageSearchPathItemEntity[]>();
    if (rows.length === 0) {
      return paths;
    }

    const leafIds = rows.map((row) => row.id);
    const chain = await this.prisma.$queryRaw<PageSearchChainRow[]>`
      WITH RECURSIVE page_chain AS (
        SELECT
          p.id AS "leafId",
          p.id,
          p."parentPageId",
          p."projectId",
          p.title,
          0 AS depth
        FROM pages p
        WHERE p.id IN (${Prisma.join(leafIds)})
        UNION ALL
        SELECT
          c."leafId",
          p.id,
          p."parentPageId",
          p."projectId",
          p.title,
          c.depth + 1
        FROM pages p
        INNER JOIN page_chain c ON p.id = c."parentPageId"
      )
      SELECT "leafId", id, "parentPageId", "projectId", title, depth
      FROM page_chain
      ORDER BY "leafId", depth DESC
    `;

    const projectIds = [
      ...new Set(
        chain
          .map((row) => row.projectId)
          .filter((projectId): projectId is string => Boolean(projectId)),
      ),
    ];
    const projects =
      projectIds.length > 0
        ? await this.prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, name: true },
          })
        : [];
    const projectNameById = new Map(
      projects.map((project) => [project.id, project.name]),
    );

    const chainByLeaf = new Map<string, PageSearchChainRow[]>();
    for (const row of chain) {
      const items = chainByLeaf.get(row.leafId) ?? [];
      items.push(row);
      chainByLeaf.set(row.leafId, items);
    }

    for (const row of rows) {
      const path: PageSearchPathItemEntity[] = [];
      const ancestors = chainByLeaf.get(row.id) ?? [];
      const projectId = row.projectId ?? ancestors[0]?.projectId ?? null;
      if (projectId) {
        const projectName = projectNameById.get(projectId);
        if (projectName) {
          path.push(
            new PageSearchPathItemEntity('project', projectId, projectName),
          );
        }
      }
      for (const ancestor of ancestors) {
        path.push(
          new PageSearchPathItemEntity('page', ancestor.id, ancestor.title),
        );
      }
      paths.set(row.id, path);
    }

    return paths;
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
