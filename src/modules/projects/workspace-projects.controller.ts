import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from '@modules/projects/projects.service';
import { CreateProjectDto } from '@modules/projects/dto';
import { ReorderProjectsDto } from '@modules/projects/dto';
import { ProjectEntity } from '@modules/projects/entities';
import { WorkspaceMemberGuard } from '@modules/workspaces/guards';
import {
  WorkspaceProjectsControllerResponse,
  WorkspaceProjectsCreateProjectResponse,
  WorkspaceProjectsFindAllByWorkspaceIdResponse,
  WorkspaceProjectsReorderProjectsResponse,
} from '@modules/projects/decorators';

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
