import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ProjectsModule } from '../../projects/projects.module';
import { WorkspacesModule } from '../../workspaces/workspaces.module';
import { PagesModule } from '../pages.module';
import { PagesVersionProcessor } from './pages-version.procesor';
import { PagesVersionRepository } from './pages-version.repository';
import { PagesVersionService } from './pages-version.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'page-versions',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    PagesModule,
    WorkspacesModule,
    ProjectsModule,
  ],
  providers: [
    PagesVersionService,
    PagesVersionRepository,
    PagesVersionProcessor,
  ],
  exports: [PagesVersionService],
})
export class PagesVersionModule {}
