export enum AttachmentKind {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export interface AllowedContentType {
  kind: AttachmentKind;
  extension: string;
}

export const ALLOWED_CONTENT_TYPES: Record<string, AllowedContentType> = {
  'image/jpeg': { kind: AttachmentKind.IMAGE, extension: 'jpg' },
  'image/png': { kind: AttachmentKind.IMAGE, extension: 'png' },
  'image/webp': { kind: AttachmentKind.IMAGE, extension: 'webp' },
  'image/gif': { kind: AttachmentKind.IMAGE, extension: 'gif' },
  'video/mp4': { kind: AttachmentKind.VIDEO, extension: 'mp4' },
  'video/webm': { kind: AttachmentKind.VIDEO, extension: 'webm' },
  'video/quicktime': { kind: AttachmentKind.VIDEO, extension: 'mov' },
};

export interface StoredObjectInfo {
  size: number;
  contentType: string | undefined;
}
