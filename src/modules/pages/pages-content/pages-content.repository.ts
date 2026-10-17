import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { extractPlainText } from './utils';

@Injectable()
export class PagesContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findContent(pageId: string) {
    return this.prisma.pageContent.findUnique({ where: { pageId } });
  }

  async upsertContent(
    pageId: string,
    workspaceId: string,
    json: Prisma.InputJsonValue,
    updatedById: string,
  ) {
    const searchText = extractPlainText(json);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const content = await tx.pageContent.upsert({
        where: { pageId },
        create: { pageId, workspaceId, json, searchText },
        // REST-запись заменяет документ целиком, старое Yjs-состояние
        // устарело: при следующей Yjs-сессии оно пересоздастся из json.
        update: { json, searchText, workspaceId, yjsState: null },
      });

      await tx.page.update({
        where: { id: pageId },
        data: { updatedAt: now, updatedById },
      });

      return content;
    });
  }

  async saveYjsState(
    pageId: string,
    yjsState: Uint8Array<ArrayBuffer>,
    json: Prisma.InputJsonValue,
    updatedById: string | null,
  ) {
    const searchText = extractPlainText(json);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const page = await tx.page.findUniqueOrThrow({
        where: { id: pageId },
        select: { workspaceId: true },
      });

      const content = await tx.pageContent.upsert({
        where: { pageId },
        create: {
          pageId,
          workspaceId: page.workspaceId,
          json,
          yjsState,
          searchText,
        },
        update: { json, yjsState, searchText, workspaceId: page.workspaceId },
      });

      await tx.page.update({
        where: { id: pageId },
        // Правка пришла из Yjs-сессии без известного редактора (сид из json) —
        // не затираем последнего редактора.
        data: { updatedAt: now, ...(updatedById ? { updatedById } : {}) },
      });

      return content;
    });
  }
}
