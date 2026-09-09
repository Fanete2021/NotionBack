import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiWorkspaceForbidden } from '../../../common/decorators/api-workspace-forbidden.decorator';
import { PresignAttachmentResultEntity } from '../entities';

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
