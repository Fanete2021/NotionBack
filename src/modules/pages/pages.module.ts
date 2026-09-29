import { PagesController } from '@modules/pages/pages.controller';
import { PagesRepository } from '@modules/pages/pages.repository';
import { PagesService } from '@modules/pages/pages.service';
import { ProjectsModule } from '@modules/projects/projects.module';
import { S3Module } from '@modules/s3';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { Module } from '@nestjs/common';
import { PagesMapper } from './pages.mapper';

@Module({
  imports: [WorkspacesModule, ProjectsModule, S3Module],
  controllers: [PagesController],
  providers: [PagesService, PagesRepository, PagesMapper],
  exports: [PagesService, PagesRepository],
})
export class PagesModule {}
