import { ApiProperty } from '@nestjs/swagger';

export class PresignAttachmentResultEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly attachmentId: string;

  @ApiProperty({
    example:
      'http://localhost:9000/notion-attachments/workspaces/...?X-Amz-Signature=...',
    description: 'Presigned PUT url. Valid for 5 minutes',
  })
  readonly uploadUrl: string;

  @ApiProperty({
    example:
      'http://localhost:9000/notion-attachments/workspaces/ws/pages/page/uuid.png',
    description: 'Final public file URL available after confirm',
  })
  readonly publicUrl: string;

  constructor(attachmentId: string, uploadUrl: string, publicUrl: string) {
    this.attachmentId = attachmentId;
    this.uploadUrl = uploadUrl;
    this.publicUrl = publicUrl;
  }
}
