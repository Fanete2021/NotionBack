import { Role } from '@prisma/client';

enum WorkspaceInviteType {
  TEMPORARY = 'TEMPORARY',
  PERMANENT = 'PERMANENT',
}

interface StoredWorkspaceInvite {
  workspaceId: string;
  role: Role;
  createdBy: string;
  createdAt: string;
}

interface ConsumedWorkspaceInvite {
  raw: string;
  stored: StoredWorkspaceInvite;
  remainingTtl: number;
}

interface TemporaryInviteSummary {
  token: string;
  role: Role;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
}

export { WorkspaceInviteType };
export type {
  StoredWorkspaceInvite,
  ConsumedWorkspaceInvite,
  TemporaryInviteSummary,
};
