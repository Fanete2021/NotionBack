import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { PagesController } from './pages.controller';
import { PagesMapper } from './pages.mapper';
import { PagesRepository } from './pages.repository';
import { PagesService } from './pages.service';

@Module({
  imports: [WorkspacesModule, ProjectsModule],
  controllers: [PagesController],
  providers: [PagesService, PagesRepository, PagesMapper],
  exports: [PagesService, PagesRepository],
})
export class PagesModule {}
