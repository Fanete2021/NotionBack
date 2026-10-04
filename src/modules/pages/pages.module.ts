import { PagesController } from '@modules/pages/pages.controller';
import { PagesRepository } from '@modules/pages/pages.repository';
import { PagesService } from '@modules/pages/pages.service';
import { ProjectsModule } from '@modules/projects/projects.module';
import { S3Module } from '@modules/s3';
import { UsersModule } from '@modules/users/users.module';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { Module } from '@nestjs/common';
import { PagesGateway } from './pages.gateway';
import { PagesMapper } from './pages.mapper';

@Module({
  imports: [UsersModule, WorkspacesModule, ProjectsModule, S3Module],
  controllers: [PagesController],
  providers: [PagesService, PagesRepository, PagesMapper, PagesGateway],
  exports: [PagesService, PagesRepository],
})
export class PagesModule {}
