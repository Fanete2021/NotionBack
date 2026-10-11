import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma';
import { PageSearchType } from '../dto/search-pages-query.dto';
import { PageSearchPathItemEntity } from '../entities';

const SNIPPET_RADIUS = 80;
const PATH_MAX_DEPTH = 32;

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

interface PageSearchPageChainRow {
  leafId: string;
  id: string;
  parentPageId: string | null;
  title: string;
  depth: number;
}

interface PageSearchProjectChainRow {
  leafId: string;
  id: string;
  name: string;
  depth: number;
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

@Injectable()
export class PagesSearchRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    rows: Array<Pick<PageSearchRow, 'id'>>,
  ): Promise<Map<string, PageSearchPathItemEntity[]>> {
    const paths = new Map<string, PageSearchPathItemEntity[]>();
    if (rows.length === 0) {
      return paths;
    }

    const leafIds = rows.map((row) => row.id);
    const [projectChain, pageChain] = await Promise.all([
      this.loadProjectChain(leafIds),
      this.loadPageChain(leafIds),
    ]);

    const projectsByLeaf = groupByLeaf(projectChain);
    const pagesByLeaf = groupByLeaf(pageChain);

    for (const row of rows) {
      const path: PageSearchPathItemEntity[] = [];
      for (const project of projectsByLeaf.get(row.id) ?? []) {
        path.push(
          new PageSearchPathItemEntity('project', project.id, project.name),
        );
      }
      for (const page of pagesByLeaf.get(row.id) ?? []) {
        path.push(new PageSearchPathItemEntity('page', page.id, page.title));
      }
      paths.set(row.id, path);
    }

    return paths;
  }

  private loadProjectChain(
    leafIds: string[],
  ): Promise<PageSearchProjectChainRow[]> {
    return this.prisma.$queryRaw<PageSearchProjectChainRow[]>`
      WITH RECURSIVE project_chain AS (
        SELECT
          p.id AS "leafId",
          pr.id,
          pr."parentProjectId",
          pr.name,
          0 AS depth
        FROM pages p
        INNER JOIN projects pr ON pr.id = p."projectId"
        WHERE p.id IN (${Prisma.join(leafIds)})
        UNION ALL
        SELECT
          c."leafId",
          pr.id,
          pr."parentProjectId",
          pr.name,
          c.depth + 1
        FROM projects pr
        INNER JOIN project_chain c ON pr.id = c."parentProjectId"
        WHERE c.depth < ${PATH_MAX_DEPTH}
      )
      SELECT "leafId", id, name, depth
      FROM project_chain
      ORDER BY "leafId", depth DESC
    `;
  }

  private loadPageChain(leafIds: string[]): Promise<PageSearchPageChainRow[]> {
    return this.prisma.$queryRaw<PageSearchPageChainRow[]>`
      WITH RECURSIVE page_chain AS (
        SELECT
          p.id AS "leafId",
          p.id,
          p."parentPageId",
          p.title,
          0 AS depth
        FROM pages p
        WHERE p.id IN (${Prisma.join(leafIds)})
        UNION ALL
        SELECT
          c."leafId",
          p.id,
          p."parentPageId",
          p.title,
          c.depth + 1
        FROM pages p
        INNER JOIN page_chain c ON p.id = c."parentPageId"
        WHERE c.depth < ${PATH_MAX_DEPTH}
      )
      SELECT "leafId", id, "parentPageId", title, depth
      FROM page_chain
      ORDER BY "leafId", depth DESC
    `;
  }
}

function groupByLeaf<T extends { leafId: string }>(
  rows: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const items = grouped.get(row.leafId) ?? [];
    items.push(row);
    grouped.set(row.leafId, items);
  }
  return grouped;
}
