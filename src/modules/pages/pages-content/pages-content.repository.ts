import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PagesContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findContent(pageId: string) {
    return this.prisma.pageContent.findUnique({ where: { pageId } });
  }

  async upsertContent(pageId: string, json: Prisma.InputJsonValue) {
    return this.prisma.pageContent.upsert({
      where: { pageId },
      create: { pageId, json },
      update: { json },
    });
  }
}
