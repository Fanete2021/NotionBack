import { ApiProperty } from '@nestjs/swagger';
import type { UploadUrlResult } from '../../s3';

class PresignUploadHeaders {
  @ApiProperty({ example: 'image/png' })
  readonly 'Content-Type'!: string;

  @ApiProperty({ example: 'status=pending' })
  readonly 'X-Amz-Tagging'!: string;
}

class PresignAttachmentResultEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly attachmentId: string;

  @ApiProperty({
    example: 'http://localhost:9000/notion-attachments/workspaces/...',
    description: 'Presigned-ссылка для загрузки файла',
  })
  readonly uploadUrl: string;

  @ApiProperty({
    example: 'PUT',
    description: 'HTTP-метод запроса',
  })
  readonly method: 'PUT';

  @ApiProperty({
    type: PresignUploadHeaders,
    description: 'Заголовки, которые обязательно нужно передать в PUT-запросе',
  })
  readonly headers: Record<string, string>;

  constructor(attachmentId: string, upload: UploadUrlResult) {
    this.attachmentId = attachmentId;
    this.uploadUrl = upload.url;
    this.method = upload.method;
    this.headers = upload.headers;
  }
}

export { PresignAttachmentResultEntity };
