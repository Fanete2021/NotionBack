import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectsService } from '../services/projects.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ReorderProjectsDto } from '../dto/reorder-projects.dto';
import { ProjectEntity } from '../entities/project.entity';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard';
import { ApiValidationErrorResponse } from '../decorators/api-bad-request.decorator';
import { ApiForbiddenResponse } from '../decorators/api-forbidden.decorator';
import { ApiUnauthorizedResponse } from '../decorators/api-unauthorized.decorator';
import { ApiInternalServerErrorResponse } from 'src/decorators/api-internal-server-error.decorator';
import { ErrorResponseDto } from '../dto/error-response.dto';

@ApiBearerAuth()
@ApiTags('Проекты воркспейса')
@ApiUnauthorizedResponse()
@ApiForbiddenResponse()
@ApiInternalServerErrorResponse()
@UseGuards(WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId/projects')
export class WorkspaceProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать проект в воркспейсе' })
  @ApiParam({ name: 'workspaceId', type: String, description: 'ID воркспейса' })
  @ApiResponse({
    status: 201,
    description: 'Проект успешно создан',
    type: ProjectEntity,
  })
  @ApiValidationErrorResponse()
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectEntity> {
    return this.projectsService.create(workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все проекты воркспейса (дерево)' })
  @ApiParam({ name: 'workspaceId', type: String, description: 'ID воркспейса' })
  @ApiResponse({
    status: 200,
    description: 'Список проектов успешно получен',
    type: [ProjectEntity],
  })
  async findAllByWorkspaceId(
    @Param('workspaceId') workspaceId: string,
  ): Promise<ProjectEntity[]> {
    return this.projectsService.findAllByWorkspaceId(workspaceId);
  }

  @Patch('order')
  @ApiOperation({ summary: 'Изменить порядок дочерних проектов в воркспейсе' })
  @ApiParam({ name: 'workspaceId', type: String, description: 'ID воркспейса' })
  @ApiResponse({
    status: 200,
    description: 'Порядок проектов успешно обновлен',
    type: [ProjectEntity],
  })
  @ApiValidationErrorResponse()
  @ApiResponse({
    status: 400,
    description:
      'Некорректный порядок или родительский проект из другого воркспейса',
    type: ErrorResponseDto,
  })
  async reorder(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ReorderProjectsDto,
  ): Promise<ProjectEntity[]> {
    return this.projectsService.reorder(workspaceId, dto);
  }
}
