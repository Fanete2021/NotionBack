import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from '@modules/projects/projects.service';
import { UpdateProjectDto } from '@modules/projects/dto';
import { ProjectEntity } from '@modules/projects/entities';
import { WorkspaceMemberGuard } from '@modules/workspaces/guards';
import { WorkspaceProjectGuard } from '@modules/projects/guards';
import {
  ProjectControllerResponse,
  ProjectDeleteResponse,
  ProjectFindByIdResponse,
  ProjectUpdateResponse,
} from '@modules/projects/decorators';
import type { AuthenticatedRequest } from '@modules/projects/types';

@ProjectControllerResponse()
@UseGuards(WorkspaceProjectGuard, WorkspaceMemberGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @ProjectFindByIdResponse()
  @Get(':id')
  findById(@Req() req: AuthenticatedRequest): ProjectEntity {
    if (!req.project) {
      throw new InternalServerErrorException('Project not loaded');
    }
    return req.project;
  }

  @ProjectUpdateResponse()
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProjectEntity> {
    return this.projectsService.update(id, dto, req.project);
  }

  @ProjectDeleteResponse()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.projectsService.delete(id);
  }
}
