import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ApiWorkspaceForbidden } from '../../../common/decorators/api-workspace-forbidden.decorator';

export function ApiDeleteDecorator() {
  return applyDecorators(
    ApiOperation({ summary: 'Soft-delete a page (moves it to trash)' }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiResponse({ status: 204, description: 'Page deleted' }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page not found' }),
  );
}
