import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ApiWorkspaceForbidden } from '../../../common/decorators/api-workspace-forbidden.decorator';
import { PageEntity } from '../entities';

export function ApiUpdateDecorator() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update a page (title, icon, type, project)',
    }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiResponse({ status: 200, type: PageEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page or project not found' }),
  );
}
