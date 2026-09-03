import type { ModuleMetadata, Type } from '@nestjs/common';

interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  publicUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

interface S3ModuleOptions {
  isGlobal?: boolean;
  config?: Partial<S3Config>;
}

interface S3ModuleAsyncOptions {
  imports?: ModuleMetadata['imports'];
  inject?: Array<Type<unknown> | string | symbol>;
  useFactory: (...args: unknown[]) => Promise<S3Config> | S3Config;
  isGlobal?: boolean;
}

interface StoredObjectInfo {
  size: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
}

interface SizeValidationResult {
  isValid: boolean;
  actualSize?: number;
}

interface S3Object {
  Key?: string;
  LastModified?: Date;
}

interface DeleteBatchResult {
  successCount: number;
  failedKeys?: string[];
}

export type {
  DeleteBatchResult,
  S3Config,
  S3ModuleAsyncOptions,
  S3ModuleOptions,
  S3Object,
  SizeValidationResult,
  StoredObjectInfo,
};
