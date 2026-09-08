import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { S3_CLIENT, S3_CONFIG } from '../constants';
import type { S3Config, UploadUrlResult } from '../types';
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
  ): Promise<UploadUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: contentType,
      Tagging: 'status=pending',
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      url,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'X-Amz-Tagging': 'status=pending',
      },
      contentType,
    };
  }

  buildPublicUrl(key: string): string {
    const normalizedKey = normalizeKey(key);
    const baseUrl = normalizeUrl(this.config.publicUrl);
    return `${baseUrl}/${normalizedKey}`;
  }
}
