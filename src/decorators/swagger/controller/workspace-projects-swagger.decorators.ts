import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiUnauthorizedResponse } from '../common/api-unauthorized.decorator';
import { ApiForbiddenResponse } from '../common/api-forbidden.decorator';
import { ApiInternalServerErrorResponse } from '../common/api-internal-server-error.decorator';
import { ProjectEntity } from '../../../entities/project.entity';

export function WorkspaceProjectsControllerResponse() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiTags('Проекты воркспейса'),
    ApiUnauthorizedResponse(),
    ApiForbiddenResponse(),
    ApiInternalServerErrorResponse(),
  );
}

export function WorkspaceProjectsCreateProjectResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Создать проект в воркспейсе' }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'ID воркспейса',
    }),
    ApiResponse({
      status: 201,
      description: 'Проект успешно создан',
      type: ProjectEntity,
    }),
  );
}

export function WorkspaceProjectsFindAllByWorkspaceIdResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Получить все проекты воркспейса (дерево)' }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'ID воркспейса',
    }),
    ApiResponse({
      status: 200,
      description: 'Список проектов успешно получен',
      type: [ProjectEntity],
    }),
  );
}

export function WorkspaceProjectsReorderProjectsResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Изменить порядок дочерних проектов в воркспейсе',
    }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'ID воркспейса',
    }),
    ApiResponse({
      status: 200,
      description: 'Порядок проектов успешно обновлен',
      type: [ProjectEntity],
    }),
  );
}
