import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { S3_CLIENT, S3_CONFIG, S3_DELETE_BATCH_LIMIT } from '../constants';
import type { DeleteBatchResult, S3Config } from '../types';
import { chunkArray, isObjectOlderThan } from '../utils';

@Injectable()
export class S3CleanupService {
  private readonly logger = new Logger(S3CleanupService.name);

  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    @Inject(S3_CONFIG) private readonly config: S3Config,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredUploads(): Promise<void> {
    this.logger.log('Starting daily cleanup of expired uploads');

    try {
      const prefix = 'workspaces/';
      const olderThanMs = 24 * 60 * 60 * 1000; // 24 часа

      const deletedCount = await this.cleanupPendingUploads(
        prefix,
        olderThanMs,
      );

      this.logger.log(
        `Daily cleanup completed. Deleted ${deletedCount} expired uploads`,
      );
    } catch (error) {
      this.logger.error('Daily cleanup failed', error);
    }
  }

  async cleanupPendingUploads(
    prefix: string,
    olderThanMs: number,
  ): Promise<number> {
    const olderThan = new Date(Date.now() - olderThanMs);
    let totalDeleted = 0;

    try {
      const objectsToDelete = await this.listObjectsOlderThan(
        prefix,
        olderThan,
      );

      for (const batch of chunkArray(objectsToDelete, S3_DELETE_BATCH_LIMIT)) {
        const result = await this.deleteBatch(batch);
        totalDeleted += result.successCount;
      }

      this.logger.log(
        `Cleaned up ${totalDeleted} pending uploads with prefix: ${prefix}`,
      );

      return totalDeleted;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup pending uploads with prefix: ${prefix}`,
        error,
      );
      throw error;
    }
  }

  private async listObjectsOlderThan(
    prefix: string,
    olderThan: Date,
  ): Promise<Array<{ Key: string; LastModified: Date }>> {
    const allObjects: Array<{ Key: string; LastModified: Date }> = [];
    let continuationToken: string | undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
        ...(continuationToken && { ContinuationToken: continuationToken }),
      });

      const response = await this.client.send(listCommand);

      const oldObjects = (response.Contents ?? []).filter(
        (obj): obj is { Key: string; LastModified: Date } =>
          isObjectOlderThan(obj, olderThan),
      );

      allObjects.push(...oldObjects);
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return allObjects;
  }

  private async deleteBatch(
    objects: Array<{ Key: string }>,
  ): Promise<DeleteBatchResult> {
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: this.config.bucket,
      Delete: {
        Objects: objects.map(({ Key }) => ({ Key })),
        Quiet: false,
      },
    });

    const result = await this.client.send(deleteCommand);

    if (result.Errors && result.Errors.length > 0) {
      const failedKeys = result.Errors.map((e) => e.Key).filter(
        Boolean,
      ) as string[];
      this.logDeleteErrors(result.Errors);

      return {
        successCount: objects.length - result.Errors.length,
        failedKeys,
      };
    }

    return {
      successCount: objects.length,
    };
  }

  private logDeleteErrors(
    errors: Array<{ Key?: string; Message?: string }>,
  ): void {
    const errorDetails = errors
      .map(({ Key, Message }) => `${Key}: ${Message}`)
      .join(', ');

    this.logger.warn(`Failed to delete objects: ${errorDetails}`);
  }
}
