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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ProjectsService } from '../services/projects.service';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectEntity } from '../entities/project.entity';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard';
import { ApiValidationErrorResponse } from '../decorators/api-bad-request.decorator';
import { ApiForbiddenResponse } from '../decorators/api-forbidden.decorator';
import { ApiUnauthorizedResponse } from '../decorators/api-unauthorized.decorator';
import { ApiInternalServerErrorResponse } from '../decorators/api-internal-server-error.decorator';
import { ApiNotFoundResponse } from '../decorators/api-not-found.decorator';

interface AuthenticatedRequest extends Request {
  project?: ProjectEntity;
}

@ApiBearerAuth()
@ApiTags('Проекты')
@ApiUnauthorizedResponse()
@ApiForbiddenResponse('Вы не являетесь участником воркспейса этого проекта')
@ApiInternalServerErrorResponse()
@ApiNotFoundResponse('Проект не найден')
@UseGuards(WorkspaceMemberGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Получить данные проекта по ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID проекта' })
  @ApiResponse({
    status: 200,
    description: 'Данные проекта успешно получены',
    type: ProjectEntity,
  })
  findById(@Req() req: AuthenticatedRequest): ProjectEntity {
    if (!req.project) {
      throw new InternalServerErrorException('Project not loaded');
    }
    return req.project;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить данные проекта' })
  @ApiParam({ name: 'id', type: String, description: 'ID проекта' })
  @ApiResponse({
    status: 200,
    description: 'Проект успешно обновлен',
    type: ProjectEntity,
  })
  @ApiValidationErrorResponse()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProjectEntity> {
    return this.projectsService.update(id, dto, req.project);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить проект' })
  @ApiParam({ name: 'id', type: String, description: 'ID проекта' })
  @ApiResponse({ status: 204, description: 'Проект успешно удален' })
  delete(@Param('id') id: string): Promise<void> {
    return this.projectsService.delete(id);
  }
}
