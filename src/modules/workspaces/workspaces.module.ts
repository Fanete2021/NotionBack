import { Module } from '@nestjs/common';
import { WorkspacesController } from '@modules/workspaces/workspaces.controller';
import { WorkspaceMembersController } from '@modules/workspaces/workspace-members.controller';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { WorkspaceMembersService } from '@modules/workspaces/workspace-members.service';
import { WorkspacesRepository } from '@modules/workspaces/workspaces.repository';
import { WorkspaceMembersRepository } from '@modules/workspaces/workspace-members.repository';
import { WorkspaceMemberGuard } from '@modules/workspaces/guards';
import { UsersModule } from '@modules/users/users.module';
import { PrismaModule } from '../../prisma';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [WorkspacesController, WorkspaceMembersController],
  providers: [
    WorkspacesService,
    WorkspaceMembersService,
    WorkspacesRepository,
    WorkspaceMembersRepository,
    WorkspaceMemberGuard,
  ],
  exports: [WorkspacesService, WorkspaceMembersService],
})
export class WorkspacesModule {}
