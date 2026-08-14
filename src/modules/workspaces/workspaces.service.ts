import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { WorkspacesRepository } from './workspaces.repository';
import { WorkspaceEntity } from './entities/workspace.entity';
import { WorkspaceMemberEntity } from './entities/workspace-member.entity';
import { UsersService } from '../users/users.service';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async create(ownerId: string, name: string): Promise<WorkspaceEntity> {
    const maxWorkspaces = this.configService.get<number>(
      'MAX_WORKSPACES_PER_USER',
      3,
    );

    const ownedCount = await this.workspacesRepository.countOwnedBy(ownerId);
    if (ownedCount >= maxWorkspaces) {
      throw new ForbiddenException(
        `Workspace limit reached (max ${maxWorkspaces} per user)`,
      );
    }

    return this.workspacesRepository.create(ownerId, name);
  }

  async findById(userId: string, id: string): Promise<WorkspaceEntity> {
    await this.assertMemberOf(id, userId);
    const workspace = await this.workspacesRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async findAllByUserId(userId: string): Promise<WorkspaceEntity[]> {
    return this.workspacesRepository.findAllByUserId(userId);
  }

  async update(
    userId: string,
    id: string,
    payload: UpdateWorkspaceDto,
  ): Promise<WorkspaceEntity> {
    await this.assertOwner(id, userId);
    const workspace = await this.workspacesRepository.update(id, payload);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.assertOwner(id, userId);
    const deleted = await this.workspacesRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Workspace not found');
    }
  }

  async listMembers(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceMemberEntity[]> {
    await this.assertMemberOf(workspaceId, userId);
    return this.workspacesRepository.findAllMembers(workspaceId);
  }

  async addMember(
    actorId: string,
    workspaceId: string,
    userId: string,
    role: Role = Role.EDITOR,
  ): Promise<WorkspaceMemberEntity> {
    await this.assertCanManageMembers(workspaceId, actorId);

    if (role === Role.ADMIN) {
      await this.assertOwner(workspaceId, actorId);
    }

    if (role === Role.OWNER) {
      throw new ForbiddenException(
        'The OWNER role can only be assigned when creating a workspace',
      );
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.workspacesRepository.addMember(workspaceId, userId, role);
  }

  async changeMemberRole(
    actorId: string,
    workspaceId: string,
    userId: string,
    role: Role,
  ): Promise<WorkspaceMemberEntity> {
    const actorMembership = await this.assertCanManageMembers(
      workspaceId,
      actorId,
    );

    if (actorId === userId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const targetMembership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );
    if (!targetMembership) {
      throw new NotFoundException('Membership not found');
    }

    this.assertCanChangeRole(actorMembership, targetMembership);

    if (role === Role.ADMIN) {
      await this.assertOwner(workspaceId, actorId);
    }

    if (role === Role.OWNER) {
      throw new ForbiddenException(
        'The OWNER role cannot be assigned to another member',
      );
    }

    const updated = await this.workspacesRepository.changeRole(
      workspaceId,
      userId,
      role,
    );
    if (!updated) {
      throw new NotFoundException('Membership not found');
    }
    return updated;
  }

  async removeMember(
    actorId: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const actorMembership = await this.assertCanManageMembers(
      workspaceId,
      actorId,
    );

    if (actorId === userId) {
      throw new ForbiddenException('You cannot remove yourself');
    }

    const targetMembership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );
    if (!targetMembership) {
      throw new NotFoundException('Membership not found');
    }

    this.assertCanChangeRole(actorMembership, targetMembership);

    const removed = await this.workspacesRepository.removeMember(
      workspaceId,
      userId,
    );
    if (!removed) {
      throw new NotFoundException('Membership not found');
    }
  }

  async assertMemberOf(workspaceId: string, userId: string): Promise<void> {
    const workspace = await this.workspacesRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
  }

  async assertOwner(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberEntity> {
    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }

    if (membership.role !== Role.OWNER) {
      throw new ForbiddenException('Only the workspace owner can do this');
    }

    return membership;
  }

  private async assertCanManageMembers(
    workspaceId: string,
    actorId: string,
  ): Promise<WorkspaceMemberEntity> {
    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      actorId,
    );

    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }

    if (membership.role !== Role.OWNER && membership.role !== Role.ADMIN) {
      throw new ForbiddenException('Only owner or admin can manage members');
    }

    return membership;
  }

  private assertCanChangeRole(
    actor: WorkspaceMemberEntity,
    target: WorkspaceMemberEntity,
  ): void {
    if (target.role === Role.OWNER) {
      throw new ForbiddenException('The workspace owner cannot be modified');
    }

    if (actor.role === Role.ADMIN && target.role === Role.ADMIN) {
      throw new ForbiddenException('Admins cannot modify other admins');
    }
  }
}
