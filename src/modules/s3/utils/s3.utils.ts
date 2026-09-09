import { NotFound } from '@aws-sdk/client-s3';

function isNotFoundError(error: unknown): boolean {
  if (error instanceof NotFound) {
    return true;
  }

  const errorName = (error as { name?: string })?.name;
  return errorName === 'NotFound' || errorName === 'NoSuchKey';
}

function normalizeKey(key: string): string {
  return key.replace(/^\/+/, '');
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export { isNotFoundError, normalizeKey, normalizeUrl };
