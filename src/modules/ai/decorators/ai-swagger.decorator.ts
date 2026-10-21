import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
  ApiValidationErrorResponse,
} from '@common/decorators/swagger';
import { ErrorResponseDto } from '@common/dto';
import { CompleteAiDto } from '../dto';
import { AiCompleteEntity } from '../entities';

function AiControllerResponse(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiBearerAuth(),
    ApiTags('AI-генерация'),
    ApiUnauthorizedResponse(),
    ApiInternalServerErrorResponse(),
  );
}

function AiCompleteResponse(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiOperation({
      summary: 'Сгенерировать или обработать текст',
      description:
        'JSON со статусом done. Заголовок Accept: text/event-stream включает SSE: status waiting, затем delta, в конце done либо error.',
    }),
    ApiBody({ type: CompleteAiDto }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Текст сгенерирован',
      type: AiCompleteEntity,
    }),
    ApiValidationErrorResponse(),
    ApiResponse({
      status: HttpStatus.BAD_GATEWAY,
      description: 'Провайдер ИИ вернул ошибку',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      description: 'Провайдер ИИ не настроен',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.GATEWAY_TIMEOUT,
      description: 'Провайдер ИИ не ответил вовремя',
      type: ErrorResponseDto,
    }),
  );
}

export { AiControllerResponse, AiCompleteResponse };
