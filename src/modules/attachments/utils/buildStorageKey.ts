import { randomUUID } from 'crypto';

const buildStorageKey = (
  workspaceId: string,
  pageId: string,
  extension: string,
): string => {
  return `workspaces/${workspaceId}/pages/${pageId}/${randomUUID()}.${extension}`;
};

export { buildStorageKey };
