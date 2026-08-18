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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiWorkspaceForbidden } from '../../common/decorators/api-workspace-forbidden.decorator';
import { PageEntity } from './entities/page.entity';
import { PageContentEntity } from './entities/page-content.entity';
import { PAGE_CONTENT_ROUTE } from './pages.routes';

@ApiBearerAuth()
@ApiTags('Pages')
@Controller()
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @Post('pages')
  @ApiOperation({ summary: 'Create a page in a project' })
  @ApiResponse({
    status: 201,
    description: 'Page created',
    type: PageEntity,
  })
  @ApiWorkspaceForbidden()
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePageDto,
  ): Promise<PageEntity> {
    await this.workspacesService.assertMemberOf(dto.workspaceId, userId);
    return this.pagesService.create(dto.workspaceId, userId, dto);
  }

  @Get('pages/:id')
  @ApiOperation({ summary: 'Get a page by id' })
  @ApiParam({ name: 'id', type: String, description: 'Page id' })
  @ApiResponse({ status: 200, type: PageEntity })
  @ApiWorkspaceForbidden()
  @ApiResponse({ status: 404, description: 'Page not found' })
  async findById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<PageEntity> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return page;
  }

  @Patch('pages/:id')
  @ApiOperation({
    summary: 'Update a page (title, icon, type, project)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Page id' })
  @ApiResponse({ status: 200, type: PageEntity })
  @ApiWorkspaceForbidden()
  @ApiResponse({ status: 404, description: 'Page or project not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
  ): Promise<PageEntity> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return this.pagesService.update(page, dto);
  }

  @Delete('pages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a page (moves it to trash)' })
  @ApiParam({ name: 'id', type: String, description: 'Page id' })
  @ApiResponse({ status: 204, description: 'Page deleted' })
  @ApiWorkspaceForbidden()
  @ApiResponse({ status: 404, description: 'Page not found' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    await this.pagesService.delete(page);
  }

  @Get(PAGE_CONTENT_ROUTE)
  @ApiOperation({ summary: 'Get a page content (TipTap JSON)' })
  @ApiParam({ name: 'id', type: String, description: 'Page id' })
  @ApiResponse({ status: 200, type: PageContentEntity })
  @ApiWorkspaceForbidden()
  @ApiResponse({ status: 404, description: 'Page not found' })
  async getContent(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<PageContentEntity> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return this.pagesService.getContent(page);
  }

  @Put(PAGE_CONTENT_ROUTE)
  @ApiOperation({ summary: 'Overwrite a page content (TipTap JSON)' })
  @ApiParam({ name: 'id', type: String, description: 'Page id' })
  @ApiBody({
    schema: { type: 'object', example: { type: 'doc', content: [] } },
    description: 'TipTap document JSON',
  })
  @ApiResponse({ status: 200, type: PageContentEntity })
  @ApiWorkspaceForbidden()
  @ApiResponse({ status: 404, description: 'Page not found' })
  @ApiResponse({
    status: 413,
    description: 'Page content exceeds the size limit',
  })
  async updateContent(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<PageContentEntity> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return this.pagesService.updateContent(page, body);
  }

  @Get('workspaces/:workspaceId/pages')
  @ApiOperation({
    summary: 'Get pages of a workspace (optionally of a project)',
  })
  @ApiParam({
    name: 'workspaceId',
    type: String,
    description: 'Workspace id',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter by project id',
  })
  @ApiResponse({ status: 200, type: [PageEntity] })
  @ApiWorkspaceForbidden()
  async findAllByWorkspaceId(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Query('projectId') projectId?: string,
  ): Promise<PageEntity[]> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return this.pagesService.findAllByWorkspaceId(workspaceId, projectId);
  }
}
