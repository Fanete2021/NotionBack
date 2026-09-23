import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Job } from 'bullmq';
import { PagesRepository } from '../pages.repository';
import { PagesVersionRepository } from './pages-version.repository';
import { AutoSnapshotJobData } from './types';

@Processor('page-versions')
export class PagesVersionProcessor extends WorkerHost {
  constructor(
    private readonly pagesVersionRepository: PagesVersionRepository,
    private readonly pagesRepository: PagesRepository,
    @InjectPinoLogger(PagesVersionProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job<AutoSnapshotJobData>) {
    try {
      const { pageId, authorId } = job.data;

      const page = await this.pagesRepository.findById(pageId, {
        content: true,
      });

      if (!page || !page.content) {
        this.logger.debug(
          { action: 'page_autosnapshot', pageId, reason: 'no_content' },
          'auto snapshot skipped',
        );
        return;
      }

      const lastVersion =
        await this.pagesVersionRepository.findLatestByPageId(pageId);

      if (lastVersion && lastVersion.createdAt >= page.content.updatedAt) {
        this.logger.debug(
          { action: 'page_autosnapshot', pageId, reason: 'no_changes' },
          'auto snapshot skipped',
        );
        return;
      }

      await this.pagesVersionRepository.create({
        pageId,
        authorId,
        snapshot: page.content.json || {},
        label: new Date().toISOString(),
      });
    } catch (error: unknown) {
      this.logger.error(
        { action: 'page_autosnapshot', pageId: job.data.pageId, err: error },
        'auto snapshot failed',
      );
      throw error;
    }
  }
}
