import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ApiWorkspaceForbidden } from '../../../../common/decorators/api-workspace-forbidden.decorator';
import { PageContentEntity } from '../entities';

export function ApiUpdateContentDecorator() {
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
