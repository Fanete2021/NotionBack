import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AUTO_SNAPSHOT_DELAY } from './consts';

@Injectable()
export class PagesVersionService {
  private readonly logger = new Logger(PagesVersionService.name);

  constructor(@InjectQueue('page-versions') private readonly queue: Queue) {}

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

    this.logger.debug(`Автоснэпшот запланирован для страницы ${pageId}`);
  }
}
