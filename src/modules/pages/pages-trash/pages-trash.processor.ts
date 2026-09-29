import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Job } from 'bullmq';
import { PagesService } from '../pages.service';
import { TRASH_QUEUE, TRASH_RETENTION_DAYS } from './consts';

@Processor(TRASH_QUEUE)
export class PagesTrashProcessor extends WorkerHost {
  constructor(
    private readonly pagesService: PagesService,
    @InjectPinoLogger(PagesTrashProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      const deletedCount =
        await this.pagesService.hardDeleteExpired(TRASH_RETENTION_DAYS);

      this.logger.info(
        { action: 'page_trash_cleanup', jobId: job.id, deletedCount },
        'trash cleanup job finished',
      );
    } catch (error: unknown) {
      this.logger.error(
        { action: 'page_trash_cleanup', jobId: job.id, err: error },
        'trash cleanup job failed',
      );
      throw error;
    }
  }
}
