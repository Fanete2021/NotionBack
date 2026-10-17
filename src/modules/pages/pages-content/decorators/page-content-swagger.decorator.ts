import { ApiWorkspaceForbidden } from '@common/decorators';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PageContentEntity } from '../entities';

function PagesGetContentResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Получить содержимое документа (JSON TipTap)' }),
    ApiParam({ name: 'id', type: String, description: 'Id документа' }),
    ApiResponse({ status: 200, type: PageContentEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Документ не найден' }),
  );
}

function PagesUpdateContentResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Перезаписать содержимое документа (JSON TipTap)',
    }),
    ApiParam({ name: 'id', type: String, description: 'Id документа' }),
    ApiBody({
      schema: { type: 'object', example: { type: 'doc', content: [] } },
      description: 'JSON-документ TipTap',
    }),
    ApiResponse({ status: 200, type: PageContentEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Документ не найден' }),
    ApiResponse({
      status: 413,
      description: 'Содержимое документа превышает лимит размера',
    }),
  );
}

export { PagesGetContentResponse, PagesUpdateContentResponse };
