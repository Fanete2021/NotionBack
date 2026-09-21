import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Role } from '@prisma/client';
import { WorkspaceMembersService } from '@modules/workspace-members/workspace-members.service';
import { WorkspaceMemberEntity } from '@modules/workspace-members/entities';
import { WorkspaceInvitesRepository } from '@modules/workspace-invites/workspace-invites.repository';
import { TemporaryInviteStore } from '@modules/workspace-invites/temporary-invite.store';
import { hashInviteToken } from '@modules/workspace-invites/utils';

@Injectable()
export class WorkspaceInviteRedeemService {
  constructor(
    private readonly invitesRepository: WorkspaceInvitesRepository,
    private readonly workspaceMembersService: WorkspaceMembersService,
    private readonly temporaryInvites: TemporaryInviteStore,
    @InjectPinoLogger(WorkspaceInviteRedeemService.name)
    private readonly logger: PinoLogger,
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
        this.logger.warn(
          {
            userId,
            action: 'invite_redeem',
            reason: 'invite_invalid_or_expired',
          },
          'invite redeem rejected',
        );
        throw new NotFoundException('Invite is invalid or expired');
      }
      workspaceId = invite.workspaceId;
      role = invite.role;
    }

    try {
      const member = await this.workspaceMembersService.addMemberViaInvite(
        workspaceId,
        userId,
        role,
      );

      this.logger.info(
        { workspaceId, userId, action: 'invite_redeem', role },
        'invite redeemed',
      );

      return member;
    } catch (error) {
      if (consumed) {
        await this.temporaryInvites.restore(tokenHash, consumed);
      }
      throw error;
    }
  }
}
