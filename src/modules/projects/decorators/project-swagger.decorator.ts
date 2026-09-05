import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiNotFoundResponse } from '../../../common/decorators/swagger/api-not-found.decorator';
import { ApiForbiddenResponse } from '../../../common/decorators/swagger/api-forbidden.decorator';
import { ProjectEntity } from '../entities/project.entity';

export function ProjectControllerResponse() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiTags('Проекты'),
    ApiUnauthorizedResponse(),
    ApiForbiddenResponse('Вы не являетесь участником воркспейса этого проекта'),
    ApiInternalServerErrorResponse(),
    ApiNotFoundResponse('Проект не найден'),
  );
}

export function ProjectFindByIdResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Получить данные проекта по ID' }),
    ApiParam({ name: 'id', type: String, description: 'ID проекта' }),
    ApiResponse({
      status: 200,
      description: 'Данные проекта успешно получены',
      type: ProjectEntity,
    }),
  );
}

export function ProjectUpdateResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Обновить данные проекта' }),
    ApiParam({ name: 'id', type: String, description: 'ID проекта' }),
    ApiResponse({
      status: 200,
      description: 'Проект успешно обновлен',
      type: ProjectEntity,
    }),
  );
}

export function ProjectDeleteResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Удалить проект' }),
    ApiParam({ name: 'id', type: String, description: 'ID проекта' }),
    ApiResponse({ status: 204, description: 'Проект успешно удален' }),
  );
}
