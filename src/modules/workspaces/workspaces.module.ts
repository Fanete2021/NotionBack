import { Module, forwardRef } from '@nestjs/common';
import { WorkspacesController } from '@modules/workspaces/workspaces.controller';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { WorkspacesRepository } from '@modules/workspaces/workspaces.repository';
import { WorkspaceMembersModule } from '@modules/workspace-members/workspace-members.module';
import { PrismaModule } from '../../prisma';

@Module({
  imports: [PrismaModule, forwardRef(() => WorkspaceMembersModule)],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspacesRepository],
  exports: [WorkspacesService, forwardRef(() => WorkspaceMembersModule)],
})
export class WorkspacesModule {}
