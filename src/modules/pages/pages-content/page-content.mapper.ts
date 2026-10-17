import { Injectable } from '@nestjs/common';
import { PageContent } from '@prisma/client';
import { PageContentEntity } from './entities';

@Injectable()
export class PagesContentMapper {
  toEntity(content: PageContent & { updatedById: string }): PageContentEntity {
    return new PageContentEntity(
      content.pageId,
      content.json,
      content.updatedAt,
      content.updatedById,
    );
  }
}
