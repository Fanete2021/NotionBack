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
  PagesFindAllByWorkspaceIdResponse,
  PagesFindByIdResponse,
  PagesUpdateResponse,
} from './decorators';
import { CreatePageDto, UpdatePageDto } from './dto';
import { PageEntity } from './entities';
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
    await this.pagesService.delete(page);
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
}
