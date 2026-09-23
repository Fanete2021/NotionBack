import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Queue } from 'bullmq';
import { AUTO_SNAPSHOT_DELAY } from './consts';

@Injectable()
export class PagesVersionService {
  constructor(
    @InjectQueue('page-versions') private readonly queue: Queue,
    @InjectPinoLogger(PagesVersionService.name)
    private readonly logger: PinoLogger,
  ) {}

  async scheduleAutoSnapshot(pageId: string, authorId: string) {
    const jobId = `auto-snapshot-${pageId}`;

    await this.queue.add(
      'auto-snapshot',
      { pageId, authorId },
      {
        jobId,
        delay: AUTO_SNAPSHOT_DELAY,
      },
    );

    this.logger.debug(
      { action: 'page_autosnapshot_schedule', pageId, userId: authorId },
      'auto snapshot scheduled',
    );
  }
}
