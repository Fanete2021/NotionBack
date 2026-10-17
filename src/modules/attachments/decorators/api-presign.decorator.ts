import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiWorkspaceForbidden } from '../../../common/decorators/api-workspace-forbidden.decorator';
import { PresignAttachmentResultEntity } from '../entities';

export function ApiPresignAttachment() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Получить presigned-ссылку для загрузки изображения или видео (участник воркспейса)',
    }),
    ApiResponse({
      status: 201,
      description: 'Presigned-ссылка для загрузки создана',
      type: PresignAttachmentResultEntity,
    }),
    ApiResponse({ status: 400, description: 'Тип содержимого не разрешён' }),
    ApiWorkspaceForbidden,
    ApiResponse({ status: 404, description: 'Документ не найден' }),
    ApiResponse({ status: 413, description: 'Файл слишком большой' }),
  );
}
