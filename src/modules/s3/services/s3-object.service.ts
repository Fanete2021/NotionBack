import {
  DeleteObjectCommand,
  GetObjectTaggingCommand,
  HeadObjectCommand,
  PutObjectTaggingCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { S3_CLIENT, S3_CONFIG } from '../constants';
import type { S3Config, StoredObjectInfo } from '../types';
import { isNotFoundError } from '../utils';

@Injectable()
export class S3ObjectService {
  private readonly logger = new Logger(S3ObjectService.name);

  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    @Inject(S3_CONFIG) private readonly config: S3Config,
  ) {}

  async getObjectInfo(key: string): Promise<StoredObjectInfo | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );

      return {
        size: response.ContentLength ?? 0,
        contentType: response.ContentType,
        etag: response.ETag,
        lastModified: response.LastModified,
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      this.logger.error(`Failed to get object info for ${key}`, error);
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete object ${key}`, error);
      throw error;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    const info = await this.getObjectInfo(key);
    return info !== null;
  }

  async getTags(key: string): Promise<Record<string, string>> {
    try {
      const response = await this.client.send(
        new GetObjectTaggingCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );

      const tags: Record<string, string> = {};
      response.TagSet?.forEach((tag) => {
        if (tag.Key && tag.Value) {
          tags[tag.Key] = tag.Value;
        }
      });

      return tags;
    } catch (error) {
      this.logger.error(`Failed to get tags for ${key}`, error);
      throw error;
    }
  }

  async setTags(key: string, tags: Record<string, string>): Promise<void> {
    await this.client.send(
      new PutObjectTaggingCommand({
        Bucket: this.config.bucket,
        Key: key,
        Tagging: {
          TagSet: Object.entries(tags).map(([Key, Value]) => ({ Key, Value })),
        },
      }),
    );
  }

  async updateTags(
    key: string,
    tagsToUpdate: Record<string, string>,
  ): Promise<void> {
    const currentTags = await this.getTags(key);

    const updatedTags = {
      ...currentTags,
      ...tagsToUpdate,
    };

    await this.setTags(key, updatedTags);
  }
}
