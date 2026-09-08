import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { WorkspaceMembersService } from '@modules/workspaces/workspace-members.service';
import { WorkspaceMemberEntity } from '@modules/workspaces/entities';
import { WorkspaceInvitesRepository } from '@modules/workspace-invites/workspace-invites.repository';
import { TemporaryInviteStore } from '@modules/workspace-invites/temporary-invite.store';
import { hashInviteToken } from '@modules/workspace-invites/utils';

@Injectable()
export class WorkspaceInviteRedeemService {
  constructor(
    private readonly invitesRepository: WorkspaceInvitesRepository,
    private readonly workspaceMembersService: WorkspaceMembersService,
    private readonly temporaryInvites: TemporaryInviteStore,
  ) {}

  async redeem(userId: string, token: string): Promise<WorkspaceMemberEntity> {
    const tokenHash = hashInviteToken(token);
    const consumed = await this.temporaryInvites.consume(tokenHash);

    let workspaceId: string;
    let role: Role;

    if (consumed) {
      workspaceId = consumed.stored.workspaceId;
      role = consumed.stored.role;
    } else {
      const invite = await this.invitesRepository.findByTokenHash(tokenHash);
      if (!invite) {
        throw new NotFoundException('Invite is invalid or expired');
      }
      workspaceId = invite.workspaceId;
      role = invite.role;
    }

    try {
      return await this.workspaceMembersService.addMemberViaInvite(
        workspaceId,
        userId,
        role,
      );
    } catch (error) {
      if (consumed) {
        await this.temporaryInvites.restore(tokenHash, consumed);
      }
      throw error;
    }
  }
}
