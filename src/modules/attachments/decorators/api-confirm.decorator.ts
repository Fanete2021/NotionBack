import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AttachmentEntity } from '../entities/';
import { ApiWorkspaceForbidden } from 'src/common/decorators/api-workspace-forbidden.decorator';

export function ApiConfirmAttachment() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Confirm a finished upload (uploader only). Verifies the real file in storage and marks the attachment CONFIRMED',
    }),
    ApiParam({ name: 'id', type: String, description: 'Attachment id' }),
    ApiResponse({
      status: 201,
      description: 'Attachment confirmed',
      type: AttachmentEntity,
    }),
    ApiResponse({
      status: 400,
      description: 'File not uploaded yet or content type mismatch',
    }),
    ApiWorkspaceForbidden,
    ApiResponse({ status: 404, description: 'Attachment not found' }),
    ApiResponse({
      status: 413,
      description: 'Uploaded file exceeds the size limit',
    }),
  );
}
