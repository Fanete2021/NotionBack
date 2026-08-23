import { ApiProperty } from '@nestjs/swagger';
import { AttachmentStatus } from '@prisma/client';

export class AttachmentEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly pageId: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly workspaceId: string;

  @ApiProperty({ example: 'cat.png' })
  readonly fileName: string;

  @ApiProperty({ example: 'image/png' })
  readonly contentType: string;

  @ApiProperty({ example: 3145728 })
  readonly size: number;

  @ApiProperty({ enum: AttachmentStatus })
  readonly status: AttachmentStatus;

  @ApiProperty({
    example: 'http://localhost:9000/notion-attachments/workspaces/...',
    description: 'Public file URL. Only meaningful once status is CONFIRMED',
  })
  readonly publicUrl: string;

  @ApiProperty({ example: '2026-08-23T00:00:00.000Z' })
  readonly createdAt: Date;

  constructor(
    id: string,
    pageId: string,
    workspaceId: string,
    fileName: string,
    contentType: string,
    size: number,
    status: AttachmentStatus,
    publicUrl: string,
    createdAt: Date,
  ) {
    this.id = id;
    this.pageId = pageId;
    this.workspaceId = workspaceId;
    this.fileName = fileName;
    this.contentType = contentType;
    this.size = size;
    this.status = status;
    this.publicUrl = publicUrl;
    this.createdAt = createdAt;
  }
}
