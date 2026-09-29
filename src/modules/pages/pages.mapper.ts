import { Injectable } from '@nestjs/common';
import { Page } from '@prisma/client';
import { PageActorEntity, PageEntity, TrashedPageEntity } from './entities';
import { TrashedPageRow, UserRef } from './types';

@Injectable()
export class PagesMapper {
  toEntity(page: Page): PageEntity {
    return PageEntity.fromModel(page);
  }

  toTrashedEntity(page: TrashedPageRow): TrashedPageEntity {
    return new TrashedPageEntity({
      id: page.id,
      workspaceId: page.workspaceId,
      projectId: page.projectId,
      title: page.title,
      icon: page.icon,
      type: page.type,
      author: this.toActor(page.author),
      deletedAt: page.deletedAt as Date,
      deletedBy: page.deletedByUser ? this.toActor(page.deletedByUser) : null,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    });
  }

  private toActor(user: UserRef): PageActorEntity {
    return new PageActorEntity({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    });
  }
}
