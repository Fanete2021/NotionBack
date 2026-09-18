import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PageCommentsRepository } from './page-comments.repository';
import { CreatePageCommentDto } from './dto';
import { UpdatePageCommentDto } from './dto';
import { ListPageCommentsQueryDto } from './dto';
import { PageCommentWithAuthor } from './types';

@Injectable()
export class PageCommentsService {
  private readonly logger = new Logger(PageCommentsService.name);

  constructor(
    private readonly pageCommentsRepository: PageCommentsRepository,
  ) {}

  async list(
    pageId: string,
    query: ListPageCommentsQueryDto,
  ): Promise<PageCommentWithAuthor[]> {
    await this.assertActivePage(pageId);

    const resolved =
      query.resolved === undefined ? undefined : query.resolved === 'true';

    return this.pageCommentsRepository.findAllByPageId(pageId, {
      anchorId: query.anchorId,
      resolved,
    });
  }

  async create(
    pageId: string,
    authorId: string,
    dto: CreatePageCommentDto,
  ): Promise<PageCommentWithAuthor> {
    await this.assertActivePage(pageId);

    const body = dto.body.trim();
    if (!body) {
      this.logger.warn(
        JSON.stringify({
          action: 'page_comment_create',
          pageId,
          userId: authorId,
          reason: 'empty_body',
        }),
        'page comment create rejected',
      );
      throw new BadRequestException('Comment body must not be empty');
    }

    const anchorId = dto.anchorId?.trim() || null;

    const comment = await this.pageCommentsRepository.create(
      pageId,
      authorId,
      body,
      anchorId,
    );

    this.logger.log(
      JSON.stringify({
        action: 'page_comment_create',
        pageId,
        commentId: comment.id,
        userId: authorId,
      }),
      'page comment created',
    );

    return comment;
  }

  async update(
    pageId: string,
    commentId: string,
    actorId: string,
    dto: UpdatePageCommentDto,
  ): Promise<PageCommentWithAuthor> {
    await this.assertActivePage(pageId);

    const comment = await this.getCommentOrThrow(pageId, commentId);

    if (comment.authorId !== actorId) {
      this.logger.warn(
        JSON.stringify({
          action: 'page_comment_update',
          pageId,
          commentId,
          userId: actorId,
          reason: 'not_author',
        }),
        'page comment update rejected',
      );
      throw new ForbiddenException('You can only edit your own comments');
    }

    const body = dto.body.trim();
    if (!body) {
      this.logger.warn(
        JSON.stringify({
          action: 'page_comment_update',
          pageId,
          commentId,
          userId: actorId,
          reason: 'empty_body',
        }),
        'page comment update rejected',
      );
      throw new BadRequestException('Comment body must not be empty');
    }

    const updated = await this.pageCommentsRepository.updateBody(
      commentId,
      pageId,
      body,
    );
    if (!updated) {
      this.logCommentNotFound(
        'page_comment_update',
        pageId,
        commentId,
        actorId,
      );
      throw new NotFoundException('Comment not found');
    }

    this.logger.log(
      JSON.stringify({
        action: 'page_comment_update',
        pageId,
        commentId,
        userId: actorId,
      }),
      'page comment updated',
    );

    return updated;
  }

  async setResolved(
    pageId: string,
    commentId: string,
    actorId: string,
    resolved: boolean,
  ): Promise<PageCommentWithAuthor> {
    await this.assertActivePage(pageId);

    const resolvedAt = resolved ? new Date() : null;
    const resolvedById = resolved ? actorId : null;

    const updated = await this.pageCommentsRepository.setResolved(
      commentId,
      pageId,
      resolved,
      resolvedById,
      resolvedAt,
    );
    if (!updated) {
      this.logCommentNotFound(
        'page_comment_resolve',
        pageId,
        commentId,
        actorId,
      );
      throw new NotFoundException('Comment not found');
    }

    this.logger.log(
      JSON.stringify({
        action: 'page_comment_resolve',
        pageId,
        commentId,
        userId: actorId,
        resolved,
      }),
      'page comment resolve status updated',
    );

    return updated;
  }

  async delete(
    pageId: string,
    commentId: string,
    actorId: string,
  ): Promise<void> {
    await this.assertActivePage(pageId);

    const comment = await this.getCommentOrThrow(pageId, commentId);

    if (comment.authorId !== actorId) {
      this.logger.warn(
        JSON.stringify({
          action: 'page_comment_delete',
          pageId,
          commentId,
          userId: actorId,
          reason: 'not_author',
        }),
        'page comment delete rejected',
      );
      throw new ForbiddenException('You can only delete your own comments');
    }

    const deleted = await this.pageCommentsRepository.delete(commentId, pageId);
    if (!deleted) {
      this.logCommentNotFound(
        'page_comment_delete',
        pageId,
        commentId,
        actorId,
      );
      throw new NotFoundException('Comment not found');
    }

    this.logger.log(
      JSON.stringify({
        action: 'page_comment_delete',
        pageId,
        commentId,
        userId: actorId,
      }),
      'page comment deleted',
    );
  }

  private async assertActivePage(pageId: string): Promise<void> {
    const activePageId =
      await this.pageCommentsRepository.findActivePageId(pageId);
    if (!activePageId) {
      throw new NotFoundException('Page not found');
    }
  }

  private logCommentNotFound(
    action: string,
    pageId: string,
    commentId: string,
    userId: string,
  ): void {
    this.logger.warn(
      JSON.stringify({
        action,
        pageId,
        commentId,
        userId,
        reason: 'comment_not_found',
      }),
      'page comment action rejected',
    );
  }

  private async getCommentOrThrow(
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
}
