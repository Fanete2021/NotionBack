import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { PagesRepository } from './pages.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [PrismaModule, WorkspacesModule, ProjectsModule],
  controllers: [PagesController],
  providers: [PagesService, PagesRepository],
})
export class PagesModule {}
