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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ReorderProjectsDto } from './dto/reorder-projects.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProjectEntity } from './entities/project.entity';

@ApiBearerAuth()
@ApiTags('Projects')
@Controller()
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @Post('workspaces/:workspaceId/projects')
  @ApiOperation({ summary: 'Create a project in a workspace' })
  @ApiParam({ name: 'workspaceId', type: String, description: 'Workspace id' })
  @ApiResponse({
    status: 201,
    description: 'Project created',
    type: ProjectEntity,
  })
  @ApiResponse({
    status: 403,
    description: 'You are not a member of this workspace',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectEntity> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return this.projectsService.create(workspaceId, dto);
  }

  @Get('workspaces/:workspaceId/projects')
  @ApiOperation({ summary: 'Get all projects of a workspace' })
  @ApiParam({ name: 'workspaceId', type: String, description: 'Workspace id' })
  @ApiResponse({ status: 200, type: [ProjectEntity] })
  @ApiResponse({
    status: 403,
    description: 'You are not a member of this workspace',
  })
  async findAllByWorkspaceId(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<ProjectEntity[]> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return this.projectsService.findAllByWorkspaceId(workspaceId);
  }

  @Patch('workspaces/:workspaceId/projects/order')
  @ApiOperation({ summary: 'Reorder sibling projects in a workspace' })
  @ApiParam({ name: 'workspaceId', type: String, description: 'Workspace id' })
  @ApiResponse({ status: 200, type: [ProjectEntity] })
  @ApiResponse({
    status: 400,
    description:
      'Parent project not in the same workspace or orderedIds mismatch',
  })
  @ApiResponse({
    status: 403,
    description: 'You are not a member of this workspace',
  })
  async reorder(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ReorderProjectsDto,
  ): Promise<ProjectEntity[]> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return this.projectsService.reorder(workspaceId, dto);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get a project by id' })
  @ApiParam({ name: 'id', type: String, description: 'Project id' })
  @ApiResponse({ status: 200, type: ProjectEntity })
  @ApiResponse({
    status: 403,
    description: 'You are not a member of this workspace',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<ProjectEntity> {
    const project = await this.projectsService.findById(id);
    await this.workspacesService.assertMemberOf(project.workspaceId, userId);
    return project;
  }

  @Patch('projects/:id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', type: String, description: 'Project id' })
  @ApiResponse({ status: 200, type: ProjectEntity })
  @ApiResponse({
    status: 403,
    description: 'You are not a member of this workspace',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    const project = await this.projectsService.findById(id);
    await this.workspacesService.assertMemberOf(project.workspaceId, userId);
    return this.projectsService.update(id, dto);
  }

  @Delete('projects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', type: String, description: 'Project id' })
  @ApiResponse({ status: 204, description: 'Project deleted' })
  @ApiResponse({
    status: 403,
    description: 'You are not a member of this workspace',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    const project = await this.projectsService.findById(id);
    await this.workspacesService.assertMemberOf(project.workspaceId, userId);
    await this.projectsService.delete(id);
  }
}
