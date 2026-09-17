import { Module } from '@nestjs/common';
import { PagesController } from '@modules/pages/pages.controller';
import { PagesService } from '@modules/pages/pages.service';
import { PagesRepository } from '@modules/pages/pages.repository';
import { PrismaModule } from '../../prisma';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { ProjectsModule } from '@modules/projects/projects.module';

@Module({
  imports: [PrismaModule, WorkspacesModule, ProjectsModule],
  controllers: [PagesController],
  providers: [PagesService, PagesRepository],
})
export class PagesModule {}
