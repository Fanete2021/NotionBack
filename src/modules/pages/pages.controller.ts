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
  Put,
  Query,
} from '@nestjs/common';
import { PagesService } from './pages.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PageEntity } from './entities/page.entity';
import { PageContentEntity } from './entities/page-content.entity';
import { PAGE_CONTENT_ROUTE } from './constants/pages.constants';
import {
  PagesControllerResponse,
  PagesCreateResponse,
  PagesDeleteResponse,
  PagesFindAllByWorkspaceIdResponse,
  PagesFindByIdResponse,
  PagesGetContentResponse,
  PagesUpdateContentResponse,
  PagesUpdateResponse,
} from './decorators/page-swagger.decorator';

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

  @PagesGetContentResponse()
  @Get(PAGE_CONTENT_ROUTE)
  async getContent(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<PageContentEntity> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return this.pagesService.getContent(page);
  }

  @PagesUpdateContentResponse()
  @Put(PAGE_CONTENT_ROUTE)
  async updateContent(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<PageContentEntity> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return this.pagesService.updateContent(page, body);
  }

  @PagesFindAllByWorkspaceIdResponse()
  @Get('workspaces/:workspaceId/pages')
  async findAllByWorkspaceId(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Query('projectId') projectId?: string,
  ): Promise<PageEntity[]> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return this.pagesService.findAllByWorkspaceId(workspaceId, projectId);
  }
}
