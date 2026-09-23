import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttachmentStatus } from '@prisma/client';
import { PagesService } from '../pages/pages.service';
import { S3ObjectService, S3UrlService } from '../s3';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AttachmentsMapper } from './attachments.mapper';
import { AttachmentsRepository } from './attachments.repository';
import {
  ALLOWED_CONTENT_TYPES,
  AttachmentKind,
  DEFAULT_IMAGE_MAX_SIZE,
  DEFAULT_PRESIGN_EXPIRES_SECONDS,
  DEFAULT_VIDEO_MAX_SIZE,
} from './constants';
import { PresignAttachmentDto } from './dto';
import { AttachmentEntity, PresignAttachmentResultEntity } from './entities';
import { AllowedContentType, AttachmentRecord } from './types';
import { buildStorageKey } from './utils';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly attachmentsRepository: AttachmentsRepository,
    private readonly s3UrlService: S3UrlService,
    private readonly s3ObjectService: S3ObjectService,
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

    const key = buildStorageKey(page.workspaceId, page.id, allowed.extension);

    const presignedUrl = await this.s3UrlService.getUploadUrl(
      key,
      contentType,
      this.getPresignExpiresSeconds(),
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

    return new PresignAttachmentResultEntity(attachment.id, presignedUrl);
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

    if (attachment.status === AttachmentStatus.CONFIRMED) {
      return this.attachmentsMapper.toEntity(attachment);
    }

    await this.assertWorkspaceMember(attachment.workspaceId, userId);

    const stored = await this.s3ObjectService.getObjectInfo(attachment.key);
    if (!stored) {
      throw new BadRequestException('File was not uploaded to the storage yet');
    }

    await this.validateStoredFile(attachment, stored.size, stored.contentType);

    await this.s3ObjectService.updateTags(attachment.key, {
      status: 'confirmed',
    });

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
        ? DEFAULT_IMAGE_MAX_SIZE
        : DEFAULT_VIDEO_MAX_SIZE;

    return this.configService.get<number>(configKey, defaultLimit);
  }

  private getPresignExpiresSeconds(): number {
    return this.configService.get<number>(
      'ATTACHMENT_PRESIGN_EXPIRES_SECONDS',
      DEFAULT_PRESIGN_EXPIRES_SECONDS,
    );
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
    await this.s3ObjectService.deleteObject(key);
    await this.attachmentsRepository.delete(attachmentId);
  }
}
