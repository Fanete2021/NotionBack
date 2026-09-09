import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma';
import { UsersModule } from '@modules/users/users.module';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { WorkspaceMembersController } from '@modules/workspace-members/workspace-members.controller';
import { WorkspaceMembersService } from '@modules/workspace-members/workspace-members.service';
import { WorkspaceMembersRepository } from '@modules/workspace-members/workspace-members.repository';
import { WorkspaceMemberGuard } from '@modules/workspace-members/guards';

@Module({
  imports: [PrismaModule, UsersModule, forwardRef(() => WorkspacesModule)],
  controllers: [WorkspaceMembersController],
  providers: [
    WorkspaceMembersService,
    WorkspaceMembersRepository,
    WorkspaceMemberGuard,
  ],
  exports: [
    WorkspaceMembersService,
    WorkspaceMembersRepository,
    WorkspaceMemberGuard,
  ],
})
export class WorkspaceMembersModule {}
