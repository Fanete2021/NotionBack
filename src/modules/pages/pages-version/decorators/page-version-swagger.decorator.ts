import { ApiWorkspaceForbidden } from '@common/decorators';
import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PageContentEntity } from '../../pages-content/entities';
import { PageVersionListEntity } from '../entities';

function PagesVersionControllerResponse(): ReturnType<typeof applyDecorators> {
  return applyDecorators(ApiBearerAuth(), ApiTags('Документы'));
}

function PagesVersionListResponse(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiOperation({ summary: 'Список версий документа, сначала новые' }),
    ApiParam({ name: 'id', type: String, description: 'Id документа' }),
    ApiResponse({ status: 200, type: PageVersionListEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Документ не найден' }),
  );
}

function PagesVersionRestoreResponse(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiOperation({
      summary:
        'Восстановить версию документа, сохранив текущее содержимое как новую версию',
    }),
    ApiParam({ name: 'id', type: String, description: 'Id версии документа' }),
    ApiResponse({ status: 200, type: PageContentEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({
      status: 404,
      description: 'Версия или документ не найдены',
    }),
  );
}

export {
  PagesVersionControllerResponse,
  PagesVersionListResponse,
  PagesVersionRestoreResponse,
};
