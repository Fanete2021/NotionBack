import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspacesService } from '../services/workspaces.service';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiUnauthorizedResponse } from '../decorators/api-unauthorized.decorator';
import { ApiForbiddenResponse } from '../decorators/api-forbidden.decorator';
import { ApiValidationErrorResponse } from '../decorators/api-bad-request.decorator';
import { ApiInternalServerErrorResponse } from '../decorators/api-internal-server-error.decorator';
import { ApiNotFoundResponse } from '../decorators/api-not-found.decorator';

@ApiBearerAuth()
@ApiTags('Воркспейсы')
@ApiUnauthorizedResponse()
@ApiInternalServerErrorResponse()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый воркспейс' })
  @ApiResponse({
    status: 201,
    description: 'Воркспейс успешно создан',
    type: WorkspaceEntity,
  })
  @ApiValidationErrorResponse()
  @ApiForbiddenResponse('Достигнут лимит создания воркспейсов')
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<WorkspaceEntity> {
    return this.workspacesService.create(userId, dto.name);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все воркспейсы текущего пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Список воркспейсов успешно получен',
    type: [WorkspaceEntity],
  })
  findAllByUserId(
    @CurrentUser('id') userId: string,
  ): Promise<WorkspaceEntity[]> {
    return this.workspacesService.findAllByUserId(userId);
  }

  @Get(':workspaceId')
  @ApiOperation({ summary: 'Получить данные воркспейса по ID' })
  @ApiParam({ name: 'workspaceId', type: String, description: 'ID воркспейса' })
  @ApiResponse({
    status: 200,
    description: 'Данные воркспейса успешно получены',
    type: WorkspaceEntity,
  })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse('Воркспейс не найден')
  findById(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceEntity> {
    return this.workspacesService.findById(workspaceId, userId);
  }

  @Patch(':workspaceId')
  @ApiOperation({ summary: 'Обновить данные воркспейса (только владелец)' })
  @ApiParam({ name: 'workspaceId', type: String, description: 'ID воркспейса' })
  @ApiResponse({
    status: 200,
    description: 'Воркспейс успешно обновлен',
    type: WorkspaceEntity,
  })
  @ApiForbiddenResponse('Только владелец воркспейса может это сделать')
  @ApiNotFoundResponse('Воркспейс не найден')
  @ApiValidationErrorResponse()
  update(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceEntity> {
    return this.workspacesService.update(workspaceId, userId, dto);
  }

  @Delete(':workspaceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить воркспейс (только владелец)' })
  @ApiParam({ name: 'workspaceId', type: String, description: 'ID воркспейса' })
  @ApiResponse({ status: 204, description: 'Воркспейс успешно удален' })
  @ApiForbiddenResponse('Только владелец воркспейса может это сделать')
  @ApiNotFoundResponse('Воркспейс не найден')
  delete(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.workspacesService.delete(workspaceId, userId);
  }
}
