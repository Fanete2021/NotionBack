import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PageContentEntity } from './entities';

type PageContentView = {
  pageId: string;
  json: Prisma.JsonValue;
  updatedAt: Date;
  updatedById: string;
};

@Injectable()
export class PagesContentMapper {
  toEntity(content: PageContentView): PageContentEntity {
    return new PageContentEntity(
      content.pageId,
      content.json,
      content.updatedAt,
      content.updatedById,
    );
  }
}
