import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ApiWorkspaceForbidden } from '../../../../common/decorators/api-workspace-forbidden.decorator';
import { PageContentEntity } from '../entities';

export function ApiGetContentDecorator() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a page content (TipTap JSON)' }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiResponse({ status: 200, type: PageContentEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page not found' }),
  );
}
