import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PageCommentsService } from './page-comments.service';
import { PageCommentsRealtimeService } from './page-comments-realtime.service';
import { PageCommentMapper } from './page-comment.mapper';
import { CurrentUser } from '@common/decorators';
import { PageCommentEntity } from './entities';
import {
  CreatePageCommentDto,
  UpdatePageCommentDto,
  SetCommentResolvedDto,
  ListPageCommentsQueryDto,
} from './dto';
import {
  PageCommentsControllerResponse,
  PageCommentsListResponse,
  PageCommentsCreateResponse,
  PageCommentsUpdateResponse,
  PageCommentsSetResolvedResponse,
  PageCommentsDeleteResponse,
} from './decorators';

@PageCommentsControllerResponse()
@Controller('pages/:pageId/comments')
export class PageCommentsController {
  constructor(
    private readonly pageCommentsService: PageCommentsService,
    private readonly pageCommentMapper: PageCommentMapper,
    private readonly pageCommentsRealtime: PageCommentsRealtimeService,
  ) {}

  @PageCommentsListResponse()
  @Get()
  async list(
    @Param('pageId') pageId: string,
    @Query() query: ListPageCommentsQueryDto,
  ): Promise<PageCommentEntity[]> {
    const comments = await this.pageCommentsService.list(pageId, query);
    return this.pageCommentMapper.toEntities(comments);
  }

  @PageCommentsCreateResponse()
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Body() dto: CreatePageCommentDto,
  ): Promise<PageCommentEntity> {
    const comment = await this.pageCommentsService.create(pageId, userId, dto);
    const entity = this.pageCommentMapper.toEntity(comment);
    this.pageCommentsRealtime.publish(userId, 'created', entity);
    return entity;
  }

  @PageCommentsUpdateResponse()
  @Patch(':commentId')
  async update(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdatePageCommentDto,
  ): Promise<PageCommentEntity> {
    const comment = await this.pageCommentsService.update(
      pageId,
      commentId,
      userId,
      dto,
    );
    const entity = this.pageCommentMapper.toEntity(comment);
    this.pageCommentsRealtime.publish(userId, 'updated', entity);
    return entity;
  }

  @PageCommentsSetResolvedResponse()
  @Patch(':commentId/resolved')
  async setResolved(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
    @Body() dto: SetCommentResolvedDto,
  ): Promise<PageCommentEntity> {
    const comment = await this.pageCommentsService.setResolved(
      pageId,
      commentId,
      userId,
      dto.resolved,
    );
    const entity = this.pageCommentMapper.toEntity(comment);
    this.pageCommentsRealtime.publish(userId, 'updated', entity);
    return entity;
  }

  @PageCommentsDeleteResponse()
  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    await this.pageCommentsService.delete(pageId, commentId, userId);
    this.pageCommentsRealtime.publishDeleted(userId, pageId, commentId);
  }
}
