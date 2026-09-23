import { ApiWorkspaceForbidden } from '@common/decorators';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PageContentEntity } from '../entities';

function PagesGetContentResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a page content (TipTap JSON)' }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiResponse({ status: 200, type: PageContentEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page not found' }),
  );
}

function PagesUpdateContentResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Overwrite a page content (TipTap JSON)' }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiBody({
      schema: { type: 'object', example: { type: 'doc', content: [] } },
      description: 'TipTap document JSON',
    }),
    ApiResponse({ status: 200, type: PageContentEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page not found' }),
    ApiResponse({
      status: 413,
      description: 'Page content exceeds the size limit',
    }),
  );
}

export { PagesGetContentResponse, PagesUpdateContentResponse };
