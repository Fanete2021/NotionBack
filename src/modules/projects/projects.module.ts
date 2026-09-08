import { Module } from '@nestjs/common';
import { ProjectsController } from '@modules/projects/projects.controller';
import { WorkspaceProjectsController } from '@modules/projects/workspace-projects.controller';
import { ProjectsService } from '@modules/projects/projects.service';
import { ProjectsRepository } from '@modules/projects/projects.repository';
import { WorkspaceProjectGuard } from '@modules/projects/guards';
import { PrismaModule } from '../../prisma';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [ProjectsController, WorkspaceProjectsController],
  providers: [ProjectsService, ProjectsRepository, WorkspaceProjectGuard],
  exports: [ProjectsRepository],
})
export class ProjectsModule {}
