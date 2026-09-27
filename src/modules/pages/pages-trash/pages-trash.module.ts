import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PagesModule } from '../pages.module';
import { TRASH_QUEUE } from './consts';
import { PagesTrashProcessor } from './pages-trash.processor';
import { PagesTrashScheduler } from './pages-trash.scheduler';

@Module({
  imports: [
    BullModule.registerQueue({
      name: TRASH_QUEUE,
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
  ],
  providers: [PagesTrashProcessor, PagesTrashScheduler],
})
export class PagesTrashModule {}
