import { Role } from '@prisma/client';

enum WorkspaceInviteType {
  TEMPORARY = 'TEMPORARY',
  PERMANENT = 'PERMANENT',
}

interface StoredWorkspaceInvite {
  workspaceId: string;
  role: Role;
  createdBy: string;
}

interface ConsumedWorkspaceInvite {
  raw: string;
  stored: StoredWorkspaceInvite;
  remainingTtl: number;
}

export { WorkspaceInviteType };
export type { StoredWorkspaceInvite, ConsumedWorkspaceInvite };
