import { Prisma } from '@prisma/client';

interface AutoSnapshotJobData {
  pageId: string;
  authorId: string;
}

interface PageVersionListItem {
  id: string;
  pageId: string;
  authorId: string;
  label: string | null;
  createdAt: Date;
}

interface PageVersionPage {
  items: PageVersionListItem[];
  nextCursor: string | null;
}

interface ListPageVersionsOptions {
  cursor?: string;
  take: number;
}

interface PageContentHead {
  pageId: string;
  json: Prisma.JsonValue;
  updatedAt: Date;
}

interface RestorePageInput {
  pageId: string;
  authorId: string;
  label: string;
  nextJson: Prisma.InputJsonValue;
}

interface RestorePageResult {
  content: PageContentHead;
  changed: boolean;
}

export type {
  AutoSnapshotJobData,
  ListPageVersionsOptions,
  PageContentHead,
  PageVersionListItem,
  PageVersionPage,
  RestorePageInput,
  RestorePageResult,
};
