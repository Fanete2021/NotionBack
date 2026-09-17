import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { PageCommentEntity } from '@modules/page-comments/entities';
import { PageCommentAuthorEntity } from '@modules/page-comments/entities';
import { COMMENT_AUTHOR_SELECT } from '@modules/page-comments/constants';
import { PageCommentWithAuthor } from '@modules/page-comments/types';
import { isNotFoundError } from '@common/utils';

type ListPageCommentsFilters = {
  anchorId?: string;
  resolved?: boolean;
};

@Injectable()
export class PageCommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assertActivePage(pageId: string): Promise<void> {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId, deletedAt: null },
      select: { id: true },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }
  }

  async create(
    pageId: string,
    authorId: string,
    body: string,
    anchorId: string | null,
  ): Promise<PageCommentEntity> {
    const comment = await this.prisma.pageComment.create({
      data: {
        pageId,
        authorId,
        body,
        anchorId,
      },
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        resolvedBy: { select: COMMENT_AUTHOR_SELECT },
      },
    });

    return this.mapToEntity(comment);
  }

  async findAllByPageId(
    pageId: string,
    filters: ListPageCommentsFilters = {},
  ): Promise<PageCommentEntity[]> {
    const where: Prisma.PageCommentWhereInput = { pageId };

    if (filters.anchorId !== undefined) {
      where.anchorId = filters.anchorId;
    }
    if (filters.resolved !== undefined) {
      where.resolved = filters.resolved;
    }

    const comments = await this.prisma.pageComment.findMany({
      where,
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        resolvedBy: { select: COMMENT_AUTHOR_SELECT },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((comment) => this.mapToEntity(comment));
  }

  async findByIdAndPageId(
    commentId: string,
    pageId: string,
  ): Promise<PageCommentEntity | null> {
    const comment = await this.prisma.pageComment.findFirst({
      where: { id: commentId, pageId },
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        resolvedBy: { select: COMMENT_AUTHOR_SELECT },
      },
    });

    if (!comment) {
      return null;
    }

    return this.mapToEntity(comment);
  }

  async updateBody(
    commentId: string,
    pageId: string,
    body: string,
  ): Promise<PageCommentEntity | null> {
    const comment = await this.prisma.pageComment
      .update({
        where: { id: commentId, pageId },
        data: { body },
        include: {
          author: { select: COMMENT_AUTHOR_SELECT },
          resolvedBy: { select: COMMENT_AUTHOR_SELECT },
        },
      })
      .catch((error) => {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      });

    return comment ? this.mapToEntity(comment) : null;
  }

  async setResolved(
    commentId: string,
    pageId: string,
    resolved: boolean,
    resolvedById: string | null,
    resolvedAt: Date | null,
  ): Promise<PageCommentEntity | null> {
    const comment = await this.prisma.pageComment
      .update({
        where: { id: commentId, pageId },
        data: {
          resolved,
          resolvedById,
          resolvedAt,
        },
        include: {
          author: { select: COMMENT_AUTHOR_SELECT },
          resolvedBy: { select: COMMENT_AUTHOR_SELECT },
        },
      })
      .catch((error) => {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      });

    return comment ? this.mapToEntity(comment) : null;
  }

  async delete(commentId: string, pageId: string): Promise<boolean> {
    try {
      await this.prisma.pageComment.delete({
        where: { id: commentId, pageId },
      });
      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  private mapToEntity(comment: PageCommentWithAuthor): PageCommentEntity {
    return new PageCommentEntity({
      id: comment.id,
      pageId: comment.pageId,
      body: comment.body,
      anchorId: comment.anchorId,
      resolved: comment.resolved,
      resolvedAt: comment.resolvedAt,
      resolvedBy: comment.resolvedBy
        ? this.mapAuthorToEntity(comment.resolvedBy)
        : null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      authorInfo: this.mapAuthorToEntity(comment.author),
    });
  }

  private mapAuthorToEntity(
    author: PageCommentWithAuthor['author'],
  ): PageCommentAuthorEntity {
    return new PageCommentAuthorEntity({
      id: author.id,
      name: author.name,
      email: author.email,
      avatarUrl: author.avatarUrl,
    });
  }
}
