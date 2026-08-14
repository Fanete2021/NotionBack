import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesRepository } from './workspaces.repository';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [WorkspacesController, WorkspaceMembersController],
  providers: [WorkspacesService, WorkspacesRepository],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
