import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiUnauthorizedResponse } from '@common/decorators/swagger';
import { ApiInternalServerErrorResponse } from '@common/decorators/swagger';
import { WorkspaceEntity } from '@modules/workspaces/entities';

export function WorkspacesControllerResponse() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiTags('Воркспейсы'),
    ApiUnauthorizedResponse(),
    ApiInternalServerErrorResponse(),
  );
}

export function WorkspacesCreateWorkspaceResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Создать новый воркспейс' }),
    ApiResponse({
      status: 201,
      description: 'Воркспейс успешно создан',
      type: WorkspaceEntity,
    }),
  );
}

export function WorkspacesFindAllByUserIdResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Получить все воркспейсы текущего пользователя' }),
    ApiResponse({
      status: 200,
      description: 'Список воркспейсов успешно получен',
      type: [WorkspaceEntity],
    }),
  );
}

export function WorkspacesFindByIdResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Получить данные воркспейса по ID' }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'ID воркспейса',
    }),
    ApiResponse({
      status: 200,
      description: 'Данные воркспейса успешно получены',
      type: WorkspaceEntity,
    }),
  );
}

export function WorkspacesUpdateResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Обновить данные воркспейса (только владелец)' }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'ID воркспейса',
    }),
    ApiResponse({
      status: 200,
      description: 'Воркспейс успешно обновлен',
      type: WorkspaceEntity,
    }),
  );
}

export function WorkspacesDeleteResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Удалить воркспейс (только владелец)' }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'ID воркспейса',
    }),
    ApiResponse({ status: 204, description: 'Воркспейс успешно удален' }),
  );
}
