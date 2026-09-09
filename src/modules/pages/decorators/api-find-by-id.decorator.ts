import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ApiWorkspaceForbidden } from '../../../common/decorators/api-workspace-forbidden.decorator';
import { PageEntity } from '../entities';

export function ApiFindByIdDecorator() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a page by id' }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiResponse({ status: 200, type: PageEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page not found' }),
  );
}
