import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PageContentEntity } from './entities';

@Injectable()
export class PagesContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findContent(pageId: string): Promise<PageContentEntity | null> {
    const content = await this.prisma.pageContent.findUnique({
      where: { pageId },
    });

    if (!content) {
      return null;
    }

    return content;
  }

  async upsertContent(
    pageId: string,
    json: Prisma.InputJsonValue,
  ): Promise<PageContentEntity> {
    return this.prisma.pageContent.upsert({
      where: { pageId },
      create: { pageId, json },
      update: { json },
    });
  }
}
