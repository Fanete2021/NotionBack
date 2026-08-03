import { Module } from '@nestjs/common';
import { ProjectsController } from '../controllers/projects.controller';
import { ProjectsService } from '../services/projects.service';
import { ProjectsRepository } from '../repositories/projects.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from './workspaces.module';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
