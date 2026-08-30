import { Module } from '@nestjs/common';
import { ProjectsController } from '../controllers/projects.controller';
import { WorkspaceProjectsController } from '../controllers/workspace-projects.controller';
import { ProjectsService } from '../services/projects.service';
import { ProjectsRepository } from '../repositories/projects.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from './workspaces.module';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard';
import { WorkspaceProjectGuard } from '../guards/workspace-project.guard';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [ProjectsController, WorkspaceProjectsController],
  providers: [
    ProjectsService,
    ProjectsRepository,
    WorkspaceMemberGuard,
    WorkspaceProjectGuard,
  ],
})
export class ProjectsModule {}
