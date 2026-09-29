import { CurrentUser } from '@common/decorators';
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
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  PagesControllerResponse,
  PagesCreateResponse,
  PagesDeleteResponse,
  PagesEmptyTrashResponse,
  PagesFindAllByWorkspaceIdResponse,
  PagesFindByIdResponse,
  PagesHardDeleteResponse,
  PagesReorderResponse,
  PagesRestoreResponse,
  PagesTrashResponse,
  PagesUpdateResponse,
} from './decorators';
import { CreatePageDto, ReorderPagesDto, UpdatePageDto } from './dto';
import {
  EmptyTrashResultEntity,
  PageEntity,
  TrashedPageEntity,
} from './entities';
import { PagesService } from './pages.service';

@PagesControllerResponse()
@Controller()
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @PagesCreateResponse()
  @Post('pages')
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePageDto,
  ): Promise<PageEntity> {
    await this.workspacesService.assertMemberOf(dto.workspaceId, userId);
    return this.pagesService.create(dto.workspaceId, userId, dto);
  }

  @PagesFindByIdResponse()
  @Get('pages/:id')
  async findById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<PageEntity> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return page;
  }

  @PagesUpdateResponse()
  @Patch('pages/:id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
  ): Promise<PageEntity> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return this.pagesService.update(page, dto);
  }

  @PagesDeleteResponse()
  @Delete('pages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    await this.pagesService.delete(page, userId);
  }

  @PagesRestoreResponse()
  @Post('pages/:id/restore')
  async restore(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<PageEntity> {
    const page = await this.pagesService.findDeletableById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return this.pagesService.restore(page);
  }

  @PagesHardDeleteResponse()
  @Delete('pages/:id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    const page = await this.pagesService.findDeletableById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    await this.pagesService.hardDelete(page);
  }

  @Get('workspaces/:workspaceId/pages/trash')
  @PagesTrashResponse()
  async findTrash(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Query('q') q?: string,
  ): Promise<TrashedPageEntity[]> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return this.pagesService.findTrash(workspaceId, q);
  }

  @Delete('workspaces/:workspaceId/pages/trash')
  @PagesEmptyTrashResponse()
  async emptyTrash(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<EmptyTrashResultEntity> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
    const deleted = await this.pagesService.emptyTrash(workspaceId);
    return new EmptyTrashResultEntity(deleted);
  }

  @Get('workspaces/:workspaceId/pages')
  @PagesFindAllByWorkspaceIdResponse()
  async findAllByWorkspaceId(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Query('projectId') projectId?: string,
  ): Promise<PageEntity[]> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return this.pagesService.findAllByWorkspaceId(workspaceId, projectId);
  }

  @PagesReorderResponse()
  @Patch('workspaces/:workspaceId/pages/order')
  async reorder(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ReorderPagesDto,
  ): Promise<PageEntity[]> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return this.pagesService.reorder(
      workspaceId,
      dto.projectId,
      dto.orderedIds,
    );
  }
}
