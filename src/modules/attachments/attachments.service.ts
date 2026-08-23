import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PagesService } from '../pages/pages.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { S3StorageService } from './s3-storage.service';
import { AttachmentsRepository } from './attachments.repository';
import { AttachmentEntity } from './entities/attachment.entity';
import { PresignAttachmentResultEntity } from './entities/presign-attachment-result.entity';
import {
  ALLOWED_CONTENT_TYPES,
  AttachmentKind,
} from './types/attachment.types';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly attachmentsRepository: AttachmentsRepository,
    private readonly storage: S3StorageService,
    private readonly pagesService: PagesService,
    private readonly workspacesService: WorkspacesService,
    private readonly configService: ConfigService,
  ) {}

  async presign(
    userId: string,
    pageId: string,
    fileName: string,
    contentType: string,
    size: number,
  ): Promise<PresignAttachmentResultEntity> {
    const allowed = ALLOWED_CONTENT_TYPES[contentType];
    if (!allowed) {
      throw new BadRequestException(
        `Content type ${contentType} is not allowed`,
      );
    }

    if (size <= 0) {
      throw new BadRequestException('Size must be a positive number');
    }

    const limit = this.getSizeLimit(allowed.kind);
    if (size > limit) {
      throw new PayloadTooLargeException(
        `File is too large. Max ${limit} bytes for ${allowed.kind}`,
      );
    }

    const page = await this.pagesService.findById(pageId);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);

    const key = `workspaces/${page.workspaceId}/pages/${page.id}/${randomUUID()}.${allowed.extension}`;

    // Sign before persisting so a signing failure does not leave an orphaned PENDING row
    const expiresInSeconds = this.configService.get<number>(
      'ATTACHMENT_PRESIGN_EXPIRES_SECONDS',
      300,
    );
    const uploadUrl = await this.storage.getUploadUrl(
      key,
      contentType,
      expiresInSeconds,
    );

    const attachment = await this.attachmentsRepository.create({
      pageId: page.id,
      workspaceId: page.workspaceId,
      uploadedBy: userId,
      fileName,
      contentType,
      size,
      key,
    });

    return new PresignAttachmentResultEntity(
      attachment.id,
      uploadUrl,
      this.storage.buildPublicUrl(key),
    );
  }

  async confirm(
    userId: string,
    attachmentId: string,
  ): Promise<AttachmentEntity> {
    const attachment = await this.attachmentsRepository.findById(attachmentId);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.uploadedBy !== userId) {
      throw new ForbiddenException('Only the uploader can confirm');
    }

    if (attachment.status === 'CONFIRMED') {
      return this.mapToEntity(attachment);
    }

    await this.workspacesService.assertMemberOf(attachment.workspaceId, userId);

    const stored = await this.storage.getObjectInfo(attachment.key);
    if (!stored) {
      throw new BadRequestException('File was not uploaded to the storage yet');
    }

    const allowed = ALLOWED_CONTENT_TYPES[attachment.contentType];
    if (!allowed) {
      // Defensive guard: presign validates the type, so this row should not exist
      await this.cleanupRejectedUpload(attachment.id, attachment.key);
      throw new BadRequestException('Unsupported attachment content type');
    }

    const limit = this.getSizeLimit(allowed.kind);
    if (stored.size > limit) {
      await this.cleanupRejectedUpload(attachment.id, attachment.key);
      throw new PayloadTooLargeException(
        `Uploaded file is too large (${stored.size} bytes). Max ${limit} bytes`,
      );
    }

    if (
      stored.contentType !== undefined &&
      stored.contentType !== attachment.contentType
    ) {
      await this.cleanupRejectedUpload(attachment.id, attachment.key);
      throw new BadRequestException('Uploaded file content type mismatch');
    }

    const confirmed = await this.attachmentsRepository.markConfirmed(
      attachment.id,
    );

    return this.mapToEntity(confirmed);
  }

  private getSizeLimit(kind: AttachmentKind): number {
    const configKey =
      kind === AttachmentKind.IMAGE
        ? 'ATTACHMENT_IMAGE_MAX_BYTES'
        : 'ATTACHMENT_VIDEO_MAX_BYTES';

    return this.configService.get<number>(
      configKey,
      kind === AttachmentKind.IMAGE ? 10485760 : 26214400,
    );
  }

  private async cleanupRejectedUpload(
    attachmentId: string,
    key: string,
  ): Promise<void> {
    await this.storage.deleteObject(key);
    await this.attachmentsRepository.delete(attachmentId);
  }

  private mapToEntity(attachment: {
    id: string;
    pageId: string;
    workspaceId: string;
    fileName: string;
    contentType: string;
    size: number;
    status: 'PENDING' | 'CONFIRMED';
    key: string;
    createdAt: Date;
  }): AttachmentEntity {
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
}
