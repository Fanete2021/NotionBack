import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiWorkspaceForbidden } from '../../../common/decorators/api-workspace-forbidden.decorator';
import { PageEntity } from '../entities';

export function ApiCreateDecorator() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a page in a project' }),
    ApiResponse({
      status: 201,
      description: 'Page created',
      type: PageEntity,
    }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Project not found' }),
  );
}
