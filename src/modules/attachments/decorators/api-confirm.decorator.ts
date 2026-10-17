import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ApiWorkspaceForbidden } from '../../../common/decorators/api-workspace-forbidden.decorator';
import { AttachmentEntity } from '../entities/';

export function ApiConfirmAttachment() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Подтвердить завершённую загрузку (только загрузивший). Проверяет файл в хранилище и переводит вложение в статус CONFIRMED',
    }),
    ApiParam({ name: 'id', type: String, description: 'Id вложения' }),
    ApiResponse({
      status: 201,
      description: 'Вложение подтверждено',
      type: AttachmentEntity,
    }),
    ApiResponse({
      status: 400,
      description: 'Файл ещё не загружен или тип содержимого не совпадает',
    }),
    ApiWorkspaceForbidden,
    ApiResponse({ status: 404, description: 'Вложение не найдено' }),
    ApiResponse({
      status: 413,
      description: 'Загруженный файл превышает лимит размера',
    }),
  );
}
