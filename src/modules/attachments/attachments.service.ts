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
import { S3StorageService } from '../s3/services';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AttachmentsMapper } from './attachments.mapper';
import { AttachmentsRepository } from './attachments.repository';
import {
  ALLOWED_CONTENT_TYPES,
  AttachmentKind,
  DEFAULT_IMAGE_MAX_BYTES,
  DEFAULT_PRESIGN_EXPIRES_SECONDS,
  DEFAULT_VIDEO_MAX_BYTES,
  MAX_ATTACHMENT_SIZE,
} from './constants';
import { PresignAttachmentDto } from './dto';
import { AttachmentEntity } from './entities/attachment.entity';
import { PresignAttachmentResultEntity } from './entities/presign-attachment-result.entity';
import { AllowedContentType, AttachmentRecord } from './types';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly attachmentsRepository: AttachmentsRepository,
    private readonly storage: S3StorageService,
    private readonly pagesService: PagesService,
    private readonly workspacesService: WorkspacesService,
    private readonly configService: ConfigService,
    private readonly attachmentsMapper: AttachmentsMapper,
  ) {}

  async presign(
    userId: string,
    dto: PresignAttachmentDto,
  ): Promise<PresignAttachmentResultEntity> {
    const { contentType, size, pageId, fileName } = dto;

    const allowed = this.validateUpload(contentType, size);
    const page = await this.pagesService.findById(pageId);

    await this.assertWorkspaceMember(page.workspaceId, userId);

    const key = this.buildStorageKey(
      page.workspaceId,
      page.id,
      allowed.extension,
    );
    const uploadUrl = await this.storage.getUploadUrl(
      key,
      contentType,
      this.getPresignExpiresSeconds(),
      MAX_ATTACHMENT_SIZE,
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
      return this.attachmentsMapper.toEntity(attachment);
    }

    await this.assertWorkspaceMember(attachment.workspaceId, userId);

    const stored = await this.storage.getObjectInfo(attachment.key);
    if (!stored) {
      throw new BadRequestException('File was not uploaded to the storage yet');
    }

    await this.validateStoredFile(attachment, stored.size, stored.contentType);

    const confirmed = await this.attachmentsRepository.markConfirmed(
      attachment.id,
      stored.size,
    );
    return this.attachmentsMapper.toEntity(confirmed);
  }

  private validateUpload(
    contentType: string,
    size: number,
  ): AllowedContentType {
    const allowed = this.getAllowedContentType(contentType);

    this.validateSize(size, allowed);

    return allowed;
  }

  private async validateStoredFile(
    attachment: AttachmentRecord,
    storedSize: number,
    storedContentType?: string,
  ) {
    try {
      const allowed = this.getAllowedContentType(attachment.contentType);
      this.validateSize(storedSize, allowed);

      if (
        storedContentType !== undefined &&
        storedContentType !== attachment.contentType
      ) {
        throw new BadRequestException('Uploaded file content type mismatch');
      }
    } catch (error) {
      await this.cleanupRejectedUpload(attachment.id, attachment.key);
      throw error;
    }
  }

  private getAllowedContentType(contentType: string): AllowedContentType {
    const allowed = ALLOWED_CONTENT_TYPES[contentType];

    if (!allowed) {
      throw new BadRequestException(
        `Content type ${contentType} is not allowed`,
      );
    }

    return allowed;
  }

  private validateSize(size: number, allowed: AllowedContentType): void {
    if (size <= 0) {
      throw new BadRequestException('Size must be a positive number');
    }

    const limit = this.getSizeLimit(allowed.kind);

    if (size > limit) {
      throw new PayloadTooLargeException(
        `File is too large. Max ${limit} bytes for ${allowed.kind}`,
      );
    }
  }

  private getSizeLimit(kind: AttachmentKind): number {
    const configKey =
      kind === AttachmentKind.IMAGE
        ? 'ATTACHMENT_IMAGE_MAX_BYTES'
        : 'ATTACHMENT_VIDEO_MAX_BYTES';

    const defaultLimit =
      kind === AttachmentKind.IMAGE
        ? DEFAULT_IMAGE_MAX_BYTES
        : DEFAULT_VIDEO_MAX_BYTES;

    return this.configService.get<number>(configKey, defaultLimit);
  }

  private getPresignExpiresSeconds(): number {
    return this.configService.get<number>(
      'ATTACHMENT_PRESIGN_EXPIRES_SECONDS',
      DEFAULT_PRESIGN_EXPIRES_SECONDS,
    );
  }

  private buildStorageKey(
    workspaceId: string,
    pageId: string,
    extension: string,
  ): string {
    return `workspaces/${workspaceId}/pages/${pageId}/${randomUUID()}.${extension}`;
  }

  private async assertWorkspaceMember(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
  }

  private async cleanupRejectedUpload(
    attachmentId: string,
    key: string,
  ): Promise<void> {
    await this.storage.deleteObject(key);
    await this.attachmentsRepository.delete(attachmentId);
  }
}
