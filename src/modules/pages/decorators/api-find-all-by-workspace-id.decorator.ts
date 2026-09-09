import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ApiWorkspaceForbidden } from '../../../common/decorators/api-workspace-forbidden.decorator';
import { PageEntity } from '../entities';

export function ApiFindAllByWorkspaceIdDecorator() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get pages of a workspace (optionally of a project)',
    }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'Workspace id',
    }),
    ApiQuery({
      name: 'projectId',
      required: false,
      type: String,
      description: 'Filter by project id',
    }),
    ApiResponse({ status: 200, type: [PageEntity] }),
    ApiWorkspaceForbidden(),
  );
}
