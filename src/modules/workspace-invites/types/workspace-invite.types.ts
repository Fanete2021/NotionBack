import { Role } from '@prisma/client';

export enum WorkspaceInviteType {
  TEMPORARY = 'TEMPORARY',
  PERMANENT = 'PERMANENT',
}

export interface StoredWorkspaceInvite {
  workspaceId: string;
  role: Role;
  createdBy: string;
}
