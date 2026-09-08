import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  forwardRef,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { WorkspaceMembersRepository } from '@modules/workspace-members/workspace-members.repository';
import { WorkspaceMemberEntity } from '@modules/workspace-members/entities';
import { UsersRepository } from '@modules/users/users.repository';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { rethrowAddMemberError } from '@modules/workspace-members/utils';

@Injectable()
export class WorkspaceMembersService {
  constructor(
    private readonly workspaceMembersRepository: WorkspaceMembersRepository,
    private readonly usersRepository: UsersRepository,
    @Inject(forwardRef(() => WorkspacesService))
    private readonly workspacesService: WorkspacesService,
  ) {}

  async listMembers(workspaceId: string): Promise<WorkspaceMemberEntity[]> {
    return this.workspaceMembersRepository.findAllMembers(workspaceId);
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
      return await this.workspaceMembersRepository.addMember(
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
      return await this.workspaceMembersRepository.addMember(
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

    const targetMembership = await this.workspaceMembersRepository.findMembership(
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

    const updated = await this.workspaceMembersRepository.changeRole(
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

    const targetMembership = await this.workspaceMembersRepository.findMembership(
      workspaceId,
      userId,
    );
    if (!targetMembership) {
      throw new NotFoundException('Membership not found');
    }

    this.assertCanChangeRole(actorMembership, targetMembership);

    const removed = await this.workspaceMembersRepository.removeMember(
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
