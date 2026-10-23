import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PageCommentsRepository } from './page-comments.repository';
import { PageCommentWithAuthor } from './types';

type CommentAction =
  'page_comment_create' | 'page_comment_update' | 'page_comment_delete';

const REJECTED_MESSAGE: Record<CommentAction, string> = {
  page_comment_create: 'page comment create rejected',
  page_comment_update: 'page comment update rejected',
  page_comment_delete: 'page comment delete rejected',
};

@Injectable()
export class PageCommentsAccessService {
  constructor(
    private readonly pageCommentsRepository: PageCommentsRepository,
    @InjectPinoLogger(PageCommentsAccessService.name)
    private readonly logger: PinoLogger,
  ) {}

  async assertActivePage(pageId: string): Promise<void> {
    const activePageId =
      await this.pageCommentsRepository.findActivePageId(pageId);
    if (!activePageId) {
      throw new NotFoundException('Page not found');
    }
  }

  async getOrThrow(
    pageId: string,
    commentId: string,
  ): Promise<PageCommentWithAuthor> {
    const comment = await this.pageCommentsRepository.findByIdAndPageId(
      commentId,
      pageId,
    );
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  assertAuthor(
    comment: PageCommentWithAuthor,
    actorId: string,
    action: 'page_comment_update' | 'page_comment_delete',
  ): void {
    if (comment.authorId === actorId) return;

    this.logger.warn(
      {
        action,
        pageId: comment.pageId,
        commentId: comment.id,
        userId: actorId,
        reason: 'not_author',
      },
      REJECTED_MESSAGE[action],
    );
    throw new ForbiddenException(
      action === 'page_comment_update'
        ? 'You can only edit your own comments'
        : 'You can only delete your own comments',
    );
  }

  requireBody(
    body: string,
    meta: {
      action: 'page_comment_create' | 'page_comment_update';
      pageId: string;
      userId: string;
      commentId?: string;
    },
  ): string {
    const trimmed = body.trim();
    if (trimmed) return trimmed;

    this.logger.warn(
      {
        action: meta.action,
        pageId: meta.pageId,
        userId: meta.userId,
        ...(meta.commentId ? { commentId: meta.commentId } : {}),
        reason: 'empty_body',
      },
      REJECTED_MESSAGE[meta.action],
    );
    throw new BadRequestException('Comment body must not be empty');
  }

  logNotFound(
    action: string,
    pageId: string,
    commentId: string,
    userId: string,
  ): void {
    this.logger.warn(
      {
        action,
        pageId,
        commentId,
        userId,
        reason: 'comment_not_found',
      },
      'page comment action rejected',
    );
  }
}
