import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { WorkspaceInviteRedeemController } from '@modules/workspace-invites/workspace-invite-redeem.controller';
import { WorkspaceInvitesController } from '@modules/workspace-invites/workspace-invites.controller';
import { WorkspaceInvitesRepository } from '@modules/workspace-invites/workspace-invites.repository';
import { WorkspaceInvitesService } from '@modules/workspace-invites/workspace-invites.service';
import { WorkspaceInviteRedeemService } from '@modules/workspace-invites/workspace-invite-redeem.service';
import { TemporaryInviteStore } from '@modules/workspace-invites/temporary-invite.store';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [WorkspaceInvitesController, WorkspaceInviteRedeemController],
  providers: [
    WorkspaceInvitesService,
    WorkspaceInviteRedeemService,
    WorkspaceInvitesRepository,
    TemporaryInviteStore,
  ],
})
export class WorkspaceInvitesModule {}
