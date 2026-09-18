import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { COMMENT_AUTHOR_SELECT } from './constants';
import { PageCommentWithAuthor } from './types';
import { isNotFoundError } from '@common/utils';

type ListPageCommentsFilters = {
  anchorId?: string;
  resolved?: boolean;
};

const commentInclude = {
  author: { select: COMMENT_AUTHOR_SELECT },
  resolvedBy: { select: COMMENT_AUTHOR_SELECT },
} as const;

@Injectable()
export class PageCommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActivePageId(pageId: string): Promise<string | null> {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId, deletedAt: null },
      select: { id: true },
    });

    return page?.id ?? null;
  }

  async create(
    pageId: string,
    authorId: string,
    body: string,
    anchorId: string | null,
  ): Promise<PageCommentWithAuthor> {
    return this.prisma.pageComment.create({
      data: {
        pageId,
        authorId,
        body,
        anchorId,
      },
      include: commentInclude,
    });
  }

  async findAllByPageId(
    pageId: string,
    filters: ListPageCommentsFilters = {},
  ): Promise<PageCommentWithAuthor[]> {
    const where: Prisma.PageCommentWhereInput = { pageId };

    if (filters.anchorId !== undefined) {
      where.anchorId = filters.anchorId;
    }
    if (filters.resolved !== undefined) {
      where.resolved = filters.resolved;
    }

    return this.prisma.pageComment.findMany({
      where,
      include: commentInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByIdAndPageId(
    commentId: string,
    pageId: string,
  ): Promise<PageCommentWithAuthor | null> {
    return this.prisma.pageComment.findFirst({
      where: { id: commentId, pageId },
      include: commentInclude,
    });
  }

  async updateBody(
    commentId: string,
    pageId: string,
    body: string,
  ): Promise<PageCommentWithAuthor | null> {
    const comment = await this.prisma.pageComment
      .update({
        where: { id: commentId, pageId },
        data: { body },
        include: commentInclude,
      })
      .catch((error) => {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      });

    return comment;
  }

  async setResolved(
    commentId: string,
    pageId: string,
    resolved: boolean,
    resolvedById: string | null,
    resolvedAt: Date | null,
  ): Promise<PageCommentWithAuthor | null> {
    const comment = await this.prisma.pageComment
      .update({
        where: { id: commentId, pageId },
        data: {
          resolved,
          resolvedById,
          resolvedAt,
        },
        include: commentInclude,
      })
      .catch((error) => {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      });

    return comment;
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
}
