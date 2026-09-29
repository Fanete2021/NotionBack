import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Queue } from 'bullmq';
import {
  TRASH_PURGE_CRON,
  TRASH_PURGE_JOB,
  TRASH_PURGE_SCHEDULER_ID,
  TRASH_QUEUE,
} from './consts';

@Injectable()
export class PagesTrashScheduler implements OnApplicationBootstrap {
  constructor(
    @InjectQueue(TRASH_QUEUE) private readonly queue: Queue,
    @InjectPinoLogger(PagesTrashScheduler.name)
    private readonly logger: PinoLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.upsertJobScheduler(
      TRASH_PURGE_SCHEDULER_ID,
      { pattern: TRASH_PURGE_CRON },
      { name: TRASH_PURGE_JOB },
    );

    this.logger.info(
      { action: 'page_trash_purge_schedule', cron: TRASH_PURGE_CRON },
      'daily trash purge scheduled',
    );
  }
}
