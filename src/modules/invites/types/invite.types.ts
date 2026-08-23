import { Role } from '@prisma/client';

export enum InviteType {
  TEMPORARY = 'TEMPORARY',
  PERMANENT = 'PERMANENT',
}

export interface StoredInvite {
  workspaceId: string;
  role: Role;
  createdBy: string;
}
