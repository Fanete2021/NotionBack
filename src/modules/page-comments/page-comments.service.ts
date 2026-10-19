import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PageCommentsAccessService } from './page-comments-access.service';
import { PageCommentsRepository } from './page-comments.repository';
import { CreatePageCommentDto } from './dto';
import { UpdatePageCommentDto } from './dto';
import { ListPageCommentsQueryDto } from './dto';
import { PageCommentWithAuthor } from './types';

@Injectable()
export class PageCommentsService {
  constructor(
    private readonly pageCommentsRepository: PageCommentsRepository,
    private readonly pageCommentsAccess: PageCommentsAccessService,
    @InjectPinoLogger(PageCommentsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async list(
    pageId: string,
    query: ListPageCommentsQueryDto,
  ): Promise<PageCommentWithAuthor[]> {
    await this.pageCommentsAccess.assertActivePage(pageId);

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
    await this.pageCommentsAccess.assertActivePage(pageId);
    const body = this.pageCommentsAccess.requireBody(dto.body, {
      action: 'page_comment_create',
      pageId,
      userId: authorId,
    });
    const anchorId = dto.anchorId?.trim() || null;

    const comment = await this.pageCommentsRepository.create(
      pageId,
      authorId,
      body,
      anchorId,
    );

    this.logger.info(
      {
        action: 'page_comment_create',
        pageId,
        commentId: comment.id,
        userId: authorId,
      },
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
    await this.pageCommentsAccess.assertActivePage(pageId);
    const comment = await this.pageCommentsAccess.getOrThrow(pageId, commentId);
    this.pageCommentsAccess.assertAuthor(
      comment,
      actorId,
      'page_comment_update',
    );
    const body = this.pageCommentsAccess.requireBody(dto.body, {
      action: 'page_comment_update',
      pageId,
      userId: actorId,
      commentId,
    });

    const updated = await this.pageCommentsRepository.updateBody(
      commentId,
      pageId,
      body,
    );
    if (!updated) {
      this.pageCommentsAccess.logNotFound(
        'page_comment_update',
        pageId,
        commentId,
        actorId,
      );
      throw new NotFoundException('Comment not found');
    }

    this.logger.info(
      {
        action: 'page_comment_update',
        pageId,
        commentId,
        userId: actorId,
      },
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
    await this.pageCommentsAccess.assertActivePage(pageId);

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
      this.pageCommentsAccess.logNotFound(
        'page_comment_resolve',
        pageId,
        commentId,
        actorId,
      );
      throw new NotFoundException('Comment not found');
    }

    this.logger.info(
      {
        action: 'page_comment_resolve',
        pageId,
        commentId,
        userId: actorId,
        resolved,
      },
      'page comment resolve status updated',
    );

    return updated;
  }

  async delete(
    pageId: string,
    commentId: string,
    actorId: string,
  ): Promise<void> {
    await this.pageCommentsAccess.assertActivePage(pageId);
    const comment = await this.pageCommentsAccess.getOrThrow(pageId, commentId);
    this.pageCommentsAccess.assertAuthor(
      comment,
      actorId,
      'page_comment_delete',
    );

    const deleted = await this.pageCommentsRepository.delete(commentId, pageId);
    if (!deleted) {
      this.pageCommentsAccess.logNotFound(
        'page_comment_delete',
        pageId,
        commentId,
        actorId,
      );
      throw new NotFoundException('Comment not found');
    }

    this.logger.info(
      {
        action: 'page_comment_delete',
        pageId,
        commentId,
        userId: actorId,
      },
      'page comment deleted',
    );
  }
}
