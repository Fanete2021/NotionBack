import { Injectable } from '@nestjs/common';
import { SizeValidationResult, StoredObjectInfo } from '../types';
import { S3ObjectService } from './s3-object.service';
import { S3UrlService } from './s3-url.service';
import { S3ValidationService } from './s3-validation.service';

@Injectable()
export class S3StorageService {
  constructor(
    private readonly urlService: S3UrlService,
    private readonly objectService: S3ObjectService,
    private readonly validationService: S3ValidationService,
  ) {}

  getUploadUrl(key: string, contentType: string, expiresInSeconds: number) {
    return this.urlService.getUploadUrl(key, contentType, expiresInSeconds);
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

  setTags(key: string, tags: Record<string, string>): Promise<void> {
    return this.objectService.setTags(key, tags);
  }

  updateTags(key: string, tagsToUpdate: Record<string, string>): Promise<void> {
    return this.objectService.updateTags(key, tagsToUpdate);
  }

  buildPublicUrl(key: string): string {
    return this.urlService.buildPublicUrl(key);
  }
}
