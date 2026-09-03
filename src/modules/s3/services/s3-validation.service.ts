import { Injectable, Logger } from '@nestjs/common';
import { SizeValidationResult } from '../types';
import { S3ObjectService } from './s3-object.service';

@Injectable()
export class S3ValidationService {
  private readonly logger = new Logger(S3ValidationService.name);

  constructor(private readonly objectService: S3ObjectService) {}

  async validateUploadedSize(
    key: string,
    expectedSize: number,
    maxAllowedSize: number,
  ): Promise<SizeValidationResult> {
    try {
      const info = await this.objectService.getObjectInfo(key);

      if (!info) {
        return { isValid: false };
      }

      const isValid = this.isSizeValid(info.size, expectedSize, maxAllowedSize);

      return {
        isValid,
        actualSize: info.size,
      };
    } catch (error) {
      this.logger.error(`Failed to validate size for ${key}`, error);
      return { isValid: false };
    }
  }

  private isSizeValid(
    actualSize: number,
    expectedSize: number,
    maxAllowedSize: number,
  ): boolean {
    const isWithinLimit = actualSize <= maxAllowedSize;
    const matchesExpected = expectedSize === 0 || actualSize === expectedSize;
    return isWithinLimit && matchesExpected;
  }
}
