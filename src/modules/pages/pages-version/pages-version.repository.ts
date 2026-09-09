import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PagesVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PageVersionUncheckedCreateInput) {
    return this.prisma.pageVersion.create({
      data,
    });
  }

  findLatestByPageId(pageId: string) {
    return this.prisma.pageVersion.findFirst({
      where: { pageId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
