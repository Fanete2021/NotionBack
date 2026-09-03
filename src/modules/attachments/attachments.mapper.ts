import { Injectable } from '@nestjs/common';
import { S3StorageService } from '../s3/services';
import { AttachmentEntity } from './entities';
import { AttachmentRecord } from './types';

@Injectable()
export class AttachmentsMapper {
  constructor(private readonly storage: S3StorageService) {}

  toEntity(attachment: AttachmentRecord): AttachmentEntity {
    return new AttachmentEntity(
      attachment.id,
      attachment.pageId,
      attachment.workspaceId,
      attachment.fileName,
      attachment.contentType,
      attachment.size,
      attachment.status,
      this.storage.buildPublicUrl(attachment.key),
      attachment.createdAt,
    );
  }

  toEntities(attachments: AttachmentRecord[]): AttachmentEntity[] {
    return attachments.map((attachment) => this.toEntity(attachment));
  }
}
