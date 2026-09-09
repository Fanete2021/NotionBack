import { AttachmentKind } from '../constants/';

interface AllowedContentType {
  kind: AttachmentKind;
  extension: string;
}

interface StoredObjectInfo {
  size: number;
  contentType: string | undefined;
}

interface AttachmentRecord {
  id: string;
  pageId: string;
  workspaceId: string;
  fileName: string;
  contentType: string;
  size: number;
  status: 'PENDING' | 'CONFIRMED';
  key: string;
  createdAt: Date;
}

export type { AllowedContentType, AttachmentRecord, StoredObjectInfo };
