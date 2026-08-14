import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ReorderProjectsDto } from './dto/reorder-projects.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProjectEntity } from './entities/project.entity';
import { ApiWorkspaceMemberForbidden } from '../../common/decorators/api-responses.decorator';

@ApiBearerAuth()
@ApiTags('Projects')
@Controller('workspaces/:workspaceId/projects')
export class WorkspaceProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a project in a workspace' })
  @ApiParam({
    name: 'workspaceId',
    type: String,
    description: 'Workspace id',
  })
  @ApiResponse({
    status: 201,
    description: 'Project created',
    type: ProjectEntity,
  })
  @ApiWorkspaceMemberForbidden()
  @ApiResponse({
    status: 400,
    description: 'Parent project not in the same workspace',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectEntity> {
    return this.projectsService.create(userId, workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects of a workspace' })
  @ApiParam({
    name: 'workspaceId',
    type: String,
    description: 'Workspace id',
  })
  @ApiResponse({
    status: 200,
    description: 'Projects tree of the workspace',
    type: [ProjectEntity],
  })
  @ApiWorkspaceMemberForbidden()
  async findAllByWorkspaceId(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<ProjectEntity[]> {
    return this.projectsService.findAllByWorkspaceId(userId, workspaceId);
  }

  @Patch('order')
  @ApiOperation({ summary: 'Reorder sibling projects in a workspace' })
  @ApiParam({
    name: 'workspaceId',
    type: String,
    description: 'Workspace id',
  })
  @ApiResponse({
    status: 200,
    description: 'Reordered projects tree',
    type: [ProjectEntity],
  })
  @ApiWorkspaceMemberForbidden()
  @ApiResponse({
    status: 400,
    description:
      'Parent project not in the same workspace or orderedIds mismatch',
  })
  async reorder(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ReorderProjectsDto,
  ): Promise<ProjectEntity[]> {
    return this.projectsService.reorder(userId, workspaceId, dto);
  }
}
