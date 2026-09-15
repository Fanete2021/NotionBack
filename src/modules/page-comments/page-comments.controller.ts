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
import { PagesService } from '@modules/pages/pages.service';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
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
  constructor(
    private readonly pageCommentsService: PageCommentsService,
    private readonly pagesService: PagesService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @PageCommentsListResponse()
  @Get()
  async list(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Query() query: ListPageCommentsQueryDto,
  ): Promise<PageCommentEntity[]> {
    const page = await this.pagesService.findById(pageId);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return this.pageCommentsService.list(pageId, query);
  }

  @PageCommentsCreateResponse()
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Body() dto: CreatePageCommentDto,
  ): Promise<PageCommentEntity> {
    const page = await this.pagesService.findById(pageId);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return this.pageCommentsService.create(pageId, userId, dto);
  }

  @PageCommentsUpdateResponse()
  @Patch(':commentId')
  async update(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdatePageCommentDto,
  ): Promise<PageCommentEntity> {
    const page = await this.pagesService.findById(pageId);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return this.pageCommentsService.update(pageId, commentId, userId, dto);
  }

  @PageCommentsSetResolvedResponse()
  @Patch(':commentId/resolved')
  async setResolved(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
    @Body() dto: SetCommentResolvedDto,
  ): Promise<PageCommentEntity> {
    const page = await this.pagesService.findById(pageId);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
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
  async delete(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    const page = await this.pagesService.findById(pageId);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    await this.pageCommentsService.delete(
      page.workspaceId,
      pageId,
      commentId,
      userId,
    );
  }
}
