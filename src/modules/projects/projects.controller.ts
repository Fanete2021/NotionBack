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
import { ProjectsService } from './projects.service';
import { UpdateProjectDto } from './dto';
import { ProjectEntity } from './entities';
import { WorkspaceMemberGuard } from '../workspaces/guards';
import { WorkspaceProjectGuard } from './guards';
import {
  ProjectControllerResponse,
  ProjectDeleteResponse,
  ProjectFindByIdResponse,
  ProjectUpdateResponse,
} from './decorators';
import type { AuthenticatedRequest } from './types';

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
