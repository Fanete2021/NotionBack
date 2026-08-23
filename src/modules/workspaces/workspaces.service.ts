import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, Prisma } from '@prisma/client';
import { WorkspacesRepository } from './workspaces.repository';
import { WorkspaceEntity } from './entities/workspace.entity';
import { WorkspaceMemberEntity } from './entities/workspace-member.entity';
import { UsersService } from '../users/users.service';

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

  async findById(id: string): Promise<WorkspaceEntity> {
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
    id: string,
    payload: Prisma.WorkspaceUpdateInput,
  ): Promise<WorkspaceEntity> {
    const workspace = await this.workspacesRepository.update(id, payload);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.workspacesRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Workspace not found');
    }
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberEntity[]> {
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
      await this.assertIsOwner(workspaceId, actorId);
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

    try {
      return await this.workspacesRepository.addMember(
        workspaceId,
        userId,
        role,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'User is already a member of this workspace',
        );
      }
      throw error;
    }
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
      await this.assertIsOwner(workspaceId, actorId);
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

  async assertOwner(workspaceId: string, userId: string): Promise<void> {
    await this.assertIsOwner(workspaceId, userId);
  }

  async assertCanManageMembers(
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

  private async assertIsOwner(
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
