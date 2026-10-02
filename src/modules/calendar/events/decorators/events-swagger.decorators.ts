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

function EventsControllerResponse() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiTags('Календарь — события'),
    ApiUnauthorizedResponse(),
    ApiForbiddenResponse('Вы не являетесь участником воркспейса события'),
    ApiInternalServerErrorResponse(),
    ApiNotFoundResponse('Событие не найдено'),
  );
}

function EventsUpdateResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Обновить событие' }),
    ApiParam({ name: 'id', type: String, description: 'ID события' }),
    ApiResponse({
      status: 200,
      description: 'Событие успешно обновлено',
      type: EventEntity,
    }),
  );
}

function EventsDeleteResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Удалить событие' }),
    ApiParam({ name: 'id', type: String, description: 'ID события' }),
    ApiResponse({ status: 204, description: 'Событие успешно удалено' }),
  );
}

export { EventsControllerResponse, EventsUpdateResponse, EventsDeleteResponse };
