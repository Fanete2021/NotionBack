import { Injectable } from '@nestjs/common';
import { PageCommentEntity } from './entities';
import { PageCommentAuthorEntity } from './entities';
import { PageCommentAuthor, PageCommentWithAuthor } from './types';

@Injectable()
export class PageCommentMapper {
  toEntity(comment: PageCommentWithAuthor): PageCommentEntity {
    return new PageCommentEntity({
      id: comment.id,
      pageId: comment.pageId,
      body: comment.body,
      anchorId: comment.anchorId,
      resolved: comment.resolved,
      resolvedAt: comment.resolvedAt,
      resolvedBy: comment.resolvedBy
        ? this.toAuthorEntity(comment.resolvedBy)
        : null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      authorInfo: this.toAuthorEntity(comment.author),
    });
  }

  toEntities(comments: PageCommentWithAuthor[]): PageCommentEntity[] {
    return comments.map((comment) => this.toEntity(comment));
  }

  private toAuthorEntity(author: PageCommentAuthor): PageCommentAuthorEntity {
    return new PageCommentAuthorEntity({
      id: author.id,
      name: author.name,
      email: author.email,
      avatarUrl: author.avatarUrl,
    });
  }
}
