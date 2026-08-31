import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { WorkspaceInviteRedeemController } from './workspace-invite-redeem.controller';
import { WorkspaceInvitesController } from './workspace-invites.controller';
import { WorkspaceInvitesRepository } from './workspace-invites.repository';
import { WorkspaceInvitesService } from './workspace-invites.service';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [WorkspaceInvitesController, WorkspaceInviteRedeemController],
  providers: [WorkspaceInvitesService, WorkspaceInvitesRepository],
})
export class WorkspaceInvitesModule {}
