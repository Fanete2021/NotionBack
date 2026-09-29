import { Injectable } from '@nestjs/common';
import { Role, Workspace } from '@prisma/client';
import { WorkspaceEntity } from './entities';

@Injectable()
export class WorkspacesMapper {
  toEntity(workspace: Workspace, role: Role): WorkspaceEntity {
    return new WorkspaceEntity(
      workspace.id,
      workspace.name,
      workspace.ownerId,
      workspace.isPublic,
      workspace.createdAt,
      role,
    );
  }
}
