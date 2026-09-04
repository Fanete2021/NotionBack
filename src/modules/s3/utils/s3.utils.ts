import { NotFound } from '@aws-sdk/client-s3';
import { S3Object } from '../types';

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

export function isObjectOlderThan(
  obj: S3Object,
  olderThan: Date,
): obj is { Key: string; LastModified: Date } {
  return Boolean(obj.Key && obj.LastModified && obj.LastModified < olderThan);
}

export function isNotFoundError(error: unknown): boolean {
  if (error instanceof NotFound) {
    return true;
  }

  const errorName = (error as { name?: string })?.name;
  return errorName === 'NotFound' || errorName === 'NoSuchKey';
}

export function normalizeKey(key: string): string {
  return key.replace(/^\/+/, '');
}

export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
