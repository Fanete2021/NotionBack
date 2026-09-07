import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMembersService } from './workspace-members.service';
import { WorkspacesRepository } from './workspaces.repository';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../prisma/prisma.module';

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
