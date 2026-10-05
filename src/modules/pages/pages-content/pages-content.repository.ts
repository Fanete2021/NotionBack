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
  ) {
    const searchText = extractPlainText(json);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const content = await tx.pageContent.upsert({
        where: { pageId },
        create: { pageId, workspaceId, json, searchText },
        update: { json, searchText, workspaceId },
      });

      await tx.page.update({
        where: { id: pageId },
        data: { updatedAt: now },
      });

      return content;
    });
  }
}
