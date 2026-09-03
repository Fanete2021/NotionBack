import { AllowedContentType } from '../types';

export const AttachmentKind = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
} as const;

export type AttachmentKind =
  (typeof AttachmentKind)[keyof typeof AttachmentKind];

export const ALLOWED_CONTENT_TYPES: Record<string, AllowedContentType> = {
  'image/jpeg': { kind: AttachmentKind.IMAGE, extension: 'jpg' },
  'image/png': { kind: AttachmentKind.IMAGE, extension: 'png' },
  'image/webp': { kind: AttachmentKind.IMAGE, extension: 'webp' },
  'image/gif': { kind: AttachmentKind.IMAGE, extension: 'gif' },
  'video/mp4': { kind: AttachmentKind.VIDEO, extension: 'mp4' },
  'video/webm': { kind: AttachmentKind.VIDEO, extension: 'webm' },
  'video/quicktime': { kind: AttachmentKind.VIDEO, extension: 'mov' },
};
