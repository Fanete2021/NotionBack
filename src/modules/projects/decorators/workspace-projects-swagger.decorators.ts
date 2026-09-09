import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiUnauthorizedResponse } from '@common/decorators/swagger';
import { ApiForbiddenResponse } from '@common/decorators/swagger';
import { ApiInternalServerErrorResponse } from '@common/decorators/swagger';
import { ProjectEntity } from '@modules/projects/entities';

function WorkspaceProjectsControllerResponse() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiTags('Проекты воркспейса'),
    ApiUnauthorizedResponse(),
    ApiForbiddenResponse(),
    ApiInternalServerErrorResponse(),
  );
}

function WorkspaceProjectsCreateProjectResponse() {
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

function WorkspaceProjectsFindAllByWorkspaceIdResponse() {
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

function WorkspaceProjectsReorderProjectsResponse() {
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

export {
  WorkspaceProjectsControllerResponse,
  WorkspaceProjectsCreateProjectResponse,
  WorkspaceProjectsFindAllByWorkspaceIdResponse,
  WorkspaceProjectsReorderProjectsResponse,
};
