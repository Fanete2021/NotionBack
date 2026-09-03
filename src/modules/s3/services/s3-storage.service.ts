import { Injectable } from '@nestjs/common';
import { SizeValidationResult, StoredObjectInfo } from '../types';
import { S3CleanupService } from './s3-cleanup.service';
import { S3ObjectService } from './s3-object.service';
import { S3UrlService } from './s3-url.service';
import { S3ValidationService } from './s3-validation.service';

@Injectable()
export class S3StorageService {
  constructor(
    private readonly urlService: S3UrlService,
    private readonly objectService: S3ObjectService,
    private readonly cleanupService: S3CleanupService,
    private readonly validationService: S3ValidationService,
  ) {}

  getUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number,
    maxSizeBytes: number,
  ): Promise<string> {
    return this.urlService.getUploadUrl(
      key,
      contentType,
      expiresInSeconds,
      maxSizeBytes,
    );
  }

  getObjectInfo(key: string): Promise<StoredObjectInfo | null> {
    return this.objectService.getObjectInfo(key);
  }

  validateUploadedSize(
    key: string,
    expectedSize: number,
    maxAllowedSize: number,
  ): Promise<SizeValidationResult> {
    return this.validationService.validateUploadedSize(
      key,
      expectedSize,
      maxAllowedSize,
    );
  }

  deleteObject(key: string): Promise<void> {
    return this.objectService.deleteObject(key);
  }

  objectExists(key: string): Promise<boolean> {
    return this.objectService.objectExists(key);
  }

  cleanupPendingUploads(prefix: string, olderThanMs: number): Promise<number> {
    return this.cleanupService.cleanupPendingUploads(prefix, olderThanMs);
  }

  buildPublicUrl(key: string): string {
    return this.urlService.buildPublicUrl(key);
  }
}
