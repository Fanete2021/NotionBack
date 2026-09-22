import { Injectable } from '@nestjs/common';
import { Page } from '@prisma/client';
import { PageEntity } from './entities';

@Injectable()
export class PagesMapper {
  toEntity(page: Page): PageEntity {
    return new PageEntity(
      page.id,
      page.workspaceId,
      page.projectId,
      page.title,
      page.icon,
      page.type,
      page.authorId,
      page.position,
      page.createdAt,
      page.updatedAt,
    );
  }
}
