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
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@common/decorators/swagger';
import { EventEntity } from '@modules/calendar/events/entities';

function WorkspaceEventsControllerResponse() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiTags('Календарь — события'),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'ID воркспейса',
    }),
    ApiUnauthorizedResponse(),
    ApiForbiddenResponse('Вы не являетесь участником воркспейса'),
    ApiInternalServerErrorResponse(),
    ApiNotFoundResponse('Воркспейс не найден'),
  );
}

function WorkspaceEventsCreateResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Создать событие в воркспейсе' }),
    ApiResponse({
      status: 201,
      description: 'Событие успешно создано',
      type: EventEntity,
    }),
  );
}

function WorkspaceEventsListResponse() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Получить события воркспейса (с фильтром по диапазону и проекту)',
    }),
    ApiResponse({
      status: 200,
      description: 'Список событий успешно получен',
      type: [EventEntity],
    }),
  );
}

export {
  WorkspaceEventsControllerResponse,
  WorkspaceEventsCreateResponse,
  WorkspaceEventsListResponse,
};
