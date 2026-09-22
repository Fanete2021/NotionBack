interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  publicUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

interface StoredObjectInfo {
  size: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
}

interface S3Object {
  Key?: string;
  LastModified?: Date;
}

interface UploadUrlResult {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  contentType: string;
}

export type { S3Config, S3Object, StoredObjectInfo, UploadUrlResult };
