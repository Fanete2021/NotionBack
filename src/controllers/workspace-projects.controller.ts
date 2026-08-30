import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ReorderProjectsDto } from '../dto/reorder-projects.dto';
import { ProjectEntity } from '../entities/project.entity';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard';
import {
  WorkspaceProjectsControllerResponse,
  WorkspaceProjectsCreateProjectResponse,
  WorkspaceProjectsFindAllByWorkspaceIdResponse,
  WorkspaceProjectsReorderProjectsResponse,
} from '../decorators/swagger/controller/workspace-projects-swagger.decorators';

@WorkspaceProjectsControllerResponse()
@UseGuards(WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId/projects')
export class WorkspaceProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @WorkspaceProjectsCreateProjectResponse()
  @Post()
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectEntity> {
    return this.projectsService.create(workspaceId, dto);
  }

  @WorkspaceProjectsFindAllByWorkspaceIdResponse()
  @Get()
  async findAllByWorkspaceId(
    @Param('workspaceId') workspaceId: string,
  ): Promise<ProjectEntity[]> {
    return this.projectsService.findAllByWorkspaceId(workspaceId);
  }

  @WorkspaceProjectsReorderProjectsResponse()
  @Patch('order')
  async reorder(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ReorderProjectsDto,
  ): Promise<ProjectEntity[]> {
    return this.projectsService.reorder(workspaceId, dto);
  }
}
