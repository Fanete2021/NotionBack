import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PageCommentsRepository } from '@modules/page-comments/page-comments.repository';
import { PageCommentEntity } from '@modules/page-comments/entities';
import { CreatePageCommentDto } from '@modules/page-comments/dto';
import { UpdatePageCommentDto } from '@modules/page-comments/dto';
import { ListPageCommentsQueryDto } from '@modules/page-comments/dto';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';

@Injectable()
export class PageCommentsService {
  constructor(
    private readonly pageCommentsRepository: PageCommentsRepository,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async list(
    pageId: string,
    query: ListPageCommentsQueryDto,
  ): Promise<PageCommentEntity[]> {
    return this.pageCommentsRepository.findAllByPageId(pageId, {
      anchorId: query.anchorId,
      resolved: query.resolved,
    });
  }

  async create(
    pageId: string,
    authorId: string,
    dto: CreatePageCommentDto,
  ): Promise<PageCommentEntity> {
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Comment body must not be empty');
    }

    const anchorId = dto.anchorId?.trim() || null;

    return this.pageCommentsRepository.create(pageId, authorId, body, anchorId);
  }

  async update(
    pageId: string,
    commentId: string,
    actorId: string,
    dto: UpdatePageCommentDto,
  ): Promise<PageCommentEntity> {
    const comment = await this.getCommentOrThrow(pageId, commentId);

    if (comment.authorInfo.id !== actorId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Comment body must not be empty');
    }

    const updated = await this.pageCommentsRepository.updateBody(
      commentId,
      pageId,
      body,
    );
    if (!updated) {
      throw new NotFoundException('Comment not found');
    }

    return updated;
  }

  async setResolved(
    pageId: string,
    commentId: string,
    actorId: string,
    resolved: boolean,
  ): Promise<PageCommentEntity> {
    await this.getCommentOrThrow(pageId, commentId);

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
      throw new NotFoundException('Comment not found');
    }

    return updated;
  }

  async delete(
    workspaceId: string,
    pageId: string,
    commentId: string,
    actorId: string,
  ): Promise<void> {
    const comment = await this.getCommentOrThrow(pageId, commentId);

    if (comment.authorInfo.id !== actorId) {
      await this.workspacesService.assertCanManageMembers(workspaceId, actorId);
    }

    const deleted = await this.pageCommentsRepository.delete(commentId, pageId);
    if (!deleted) {
      throw new NotFoundException('Comment not found');
    }
  }

  private async getCommentOrThrow(
    pageId: string,
    commentId: string,
  ): Promise<PageCommentEntity> {
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
