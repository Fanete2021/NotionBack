import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  NotFound as S3NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StoredObjectInfo } from './types/attachment.types';

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(configService: ConfigService) {
    this.bucket = configService.get<string>('S3_BUCKET')!;
    this.publicUrl = configService.get<string>('S3_PUBLIC_URL')!;
    this.client = new S3Client({
      endpoint: configService.get<string>('S3_ENDPOINT'),
      region: configService.get<string>('S3_REGION'),
      credentials: {
        accessKeyId: configService.get<string>('S3_ACCESS_KEY_ID')!,
        secretAccessKey: configService.get<string>('S3_SECRET_ACCESS_KEY')!,
      },
      forcePathStyle: true,
    });
  }

  async getUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
      // Enforce the exact Content-Type at PUT time (not signed by default)
      signableHeaders: new Set(['content-type']),
    });
  }

  async getObjectInfo(key: string): Promise<StoredObjectInfo | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );

      return {
        size: response.ContentLength ?? 0,
        contentType: response.ContentType,
      };
    } catch (error) {
      if (
        error instanceof S3NotFound ||
        (error as { name?: string }).name === 'NotFound'
      ) {
        return null;
      }
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  buildPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}
