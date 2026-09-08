import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMembersService } from './workspace-members.service';
import { WorkspacesRepository } from './workspaces.repository';
import { WorkspaceMemberGuard } from './guards';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../prisma';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [WorkspacesController, WorkspaceMembersController],
  providers: [
    WorkspacesService,
    WorkspaceMembersService,
    WorkspacesRepository,
    WorkspaceMemberGuard,
  ],
  exports: [WorkspacesService, WorkspaceMembersService],
})
export class WorkspacesModule {}
