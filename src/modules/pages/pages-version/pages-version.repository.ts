import { Injectable } from '@nestjs/common';
import { PageVersion, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { EMPTY_DOCUMENT } from '../constants';
import { extractPlainText } from '../pages-content/utils';
import {
  ListPageVersionsOptions,
  PageVersionListItem,
  RestorePageInput,
  RestorePageResult,
} from './types';

@Injectable()
export class PagesVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PageVersionUncheckedCreateInput): Promise<PageVersion> {
    return this.prisma.pageVersion.create({
      data,
    });
  }

  findLatestByPageId(pageId: string): Promise<PageVersion | null> {
    return this.prisma.pageVersion.findFirst({
      where: { pageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<PageVersion | null> {
    return this.prisma.pageVersion.findUnique({ where: { id } });
  }

  findManyByPageId(
    pageId: string,
    options: ListPageVersionsOptions,
  ): Promise<PageVersionListItem[]> {
    return this.prisma.pageVersion.findMany({
      where: { pageId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.take,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        pageId: true,
        authorId: true,
        label: true,
        createdAt: true,
      },
    });
  }

  restore(input: RestorePageInput): Promise<RestorePageResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM pages WHERE id = ${input.pageId} FOR UPDATE
      `;
      await tx.$queryRaw`
        SELECT "pageId" FROM page_contents WHERE "pageId" = ${input.pageId} FOR UPDATE
      `;

      const content = await tx.pageContent.findUnique({
        where: { pageId: input.pageId },
        select: { pageId: true, json: true, updatedAt: true },
      });
      const currentJson = content?.json ?? (EMPTY_DOCUMENT as Prisma.JsonValue);

      if (jsonEquals(currentJson, input.nextJson as Prisma.JsonValue)) {
        return {
          changed: false,
          content: {
            pageId: input.pageId,
            json: currentJson,
            updatedAt: content?.updatedAt ?? new Date(),
          },
        };
      }

      const snapshot = toInputJson(currentJson);

      await tx.pageVersion.create({
        data: {
          pageId: input.pageId,
          authorId: input.authorId,
          snapshot,
          label: input.label,
        },
      });

      const updated = await tx.pageContent.upsert({
        where: { pageId: input.pageId },
        create: {
          pageId: input.pageId,
          json: input.nextJson,
          searchText: extractPlainText(input.nextJson),
        },
        update: {
          json: input.nextJson,
          searchText: extractPlainText(input.nextJson),
        },
        select: { pageId: true, json: true, updatedAt: true },
      });

      return { changed: true, content: updated };
    });
  }
}

function jsonEquals(left: Prisma.JsonValue, right: Prisma.JsonValue): boolean {
  return (
    JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))
  );
}

function canonicalize(value: Prisma.JsonValue): Prisma.JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (value !== null && typeof value === 'object') {
    const sorted: { [key: string]: Prisma.JsonValue } = {};
    for (const key of Object.keys(value).sort()) {
      const child = value[key];
      if (child === undefined) {
        continue;
      }
      sorted[key] = canonicalize(child);
    }
    return sorted;
  }

  return value;
}

function toInputJson(value: Prisma.JsonValue): Prisma.InputJsonValue {
  if (value === null) {
    return EMPTY_DOCUMENT;
  }

  return value;
}
