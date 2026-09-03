import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PresignAttachmentResultEntity } from '../entities';
import { ApiWorkspaceForbidden } from 'src/common/decorators/api-workspace-forbidden.decorator';

export function ApiPresignAttachment() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Get a presigned upload url for an image/video attachment (workspace member)',
    }),
    ApiResponse({
      status: 201,
      description: 'Presigned upload url created',
      type: PresignAttachmentResultEntity,
    }),
    ApiResponse({ status: 400, description: 'Content type not allowed' }),
    ApiWorkspaceForbidden,
    ApiResponse({ status: 404, description: 'Page not found' }),
    ApiResponse({ status: 413, description: 'File is too large' }),
  );
}
