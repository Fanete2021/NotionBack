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
import { PageCommentsService } from '@modules/page-comments/page-comments.service';
import { CurrentUser } from '@common/decorators';
import { PageCommentEntity } from '@modules/page-comments/entities';
import {
  CreatePageCommentDto,
  UpdatePageCommentDto,
  SetCommentResolvedDto,
  ListPageCommentsQueryDto,
} from '@modules/page-comments/dto';
import {
  PageCommentsControllerResponse,
  PageCommentsListResponse,
  PageCommentsCreateResponse,
  PageCommentsUpdateResponse,
  PageCommentsSetResolvedResponse,
  PageCommentsDeleteResponse,
} from '@modules/page-comments/decorators';

@PageCommentsControllerResponse()
@Controller('pages/:pageId/comments')
export class PageCommentsController {
  constructor(private readonly pageCommentsService: PageCommentsService) {}

  @PageCommentsListResponse()
  @Get()
  list(
    @Param('pageId') pageId: string,
    @Query() query: ListPageCommentsQueryDto,
  ): Promise<PageCommentEntity[]> {
    return this.pageCommentsService.list(pageId, query);
  }

  @PageCommentsCreateResponse()
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Body() dto: CreatePageCommentDto,
  ): Promise<PageCommentEntity> {
    return this.pageCommentsService.create(pageId, userId, dto);
  }

  @PageCommentsUpdateResponse()
  @Patch(':commentId')
  update(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdatePageCommentDto,
  ): Promise<PageCommentEntity> {
    return this.pageCommentsService.update(pageId, commentId, userId, dto);
  }

  @PageCommentsSetResolvedResponse()
  @Patch(':commentId/resolved')
  setResolved(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
    @Body() dto: SetCommentResolvedDto,
  ): Promise<PageCommentEntity> {
    return this.pageCommentsService.setResolved(
      pageId,
      commentId,
      userId,
      dto.resolved,
    );
  }

  @PageCommentsDeleteResponse()
  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    return this.pageCommentsService.delete(pageId, commentId, userId);
  }
}
