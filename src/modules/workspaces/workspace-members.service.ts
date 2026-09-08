import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { WorkspacesRepository } from './workspaces.repository';
import { WorkspaceMemberEntity } from './entities';
import { UsersRepository } from '../users/users.repository';
import { WorkspacesService } from './workspaces.service';
import { rethrowAddMemberError } from './utils';

@Injectable()
export class WorkspaceMembersService {
  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async listMembers(workspaceId: string): Promise<WorkspaceMemberEntity[]> {
    return this.workspacesRepository.findAllMembers(workspaceId);
  }

  async addMember(
    actorId: string,
    workspaceId: string,
    userId: string,
    role: Role = Role.EDITOR,
  ): Promise<WorkspaceMemberEntity> {
    await this.workspacesService.assertCanManageMembers(workspaceId, actorId);

    if (role === Role.ADMIN) {
      await this.workspacesService.assertOwner(workspaceId, actorId);
    }

    if (role === Role.OWNER) {
      throw new ForbiddenException(
        'The OWNER role can only be assigned when creating a workspace',
      );
    }

    const user = await this.usersRepository.findById(userId);
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
      rethrowAddMemberError(error);
    }
  }

  async addMemberViaInvite(
    workspaceId: string,
    userId: string,
    role: Role,
  ): Promise<WorkspaceMemberEntity> {
    try {
      return await this.workspacesRepository.addMember(
        workspaceId,
        userId,
        role,
      );
    } catch (error) {
      rethrowAddMemberError(error);
    }
  }

  async changeMemberRole(
    actorId: string,
    workspaceId: string,
    userId: string,
    role: Role,
  ): Promise<WorkspaceMemberEntity> {
    const actorMembership = await this.workspacesService.assertCanManageMembers(
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
      await this.workspacesService.assertOwner(workspaceId, actorId);
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
    const actorMembership = await this.workspacesService.assertCanManageMembers(
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
