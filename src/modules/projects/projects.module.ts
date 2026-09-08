import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { WorkspaceProjectsController } from './workspace-projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectsRepository } from './projects.repository';
import { WorkspaceProjectGuard } from './guards';
import { WorkspaceMemberGuard } from '../workspaces/guards';
import { PrismaModule } from '../../prisma';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [ProjectsController, WorkspaceProjectsController],
  providers: [
    ProjectsService,
    ProjectsRepository,
    WorkspaceMemberGuard,
    WorkspaceProjectGuard,
  ],
  exports: [ProjectsRepository],
})
export class ProjectsModule {}
