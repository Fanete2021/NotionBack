import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { S3_CLIENT, S3_CONFIG } from '../constants';
import type { S3Config } from '../types';
import { normalizeKey, normalizeUrl } from '../utils';

@Injectable()
export class S3UrlService {
  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    @Inject(S3_CONFIG) private readonly config: S3Config,
  ) {}

  async getUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number,
    maxSizeBytes: number,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: maxSizeBytes,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
      signableHeaders: new Set(['content-type', 'content-length']),
    });
  }

  buildPublicUrl(key: string): string {
    const normalizedKey = normalizeKey(key);
    const baseUrl = normalizeUrl(this.config.publicUrl);
    return `${baseUrl}/${normalizedKey}`;
  }
}
