import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PagesRepository } from '../pages.repository';
import { PagesVersionRepository } from './pages-version.repository';
import { AutoSnapshotJobData } from './types';

@Processor('page-versions')
export class PagesVersionProcessor extends WorkerHost {
  private readonly logger = new Logger(PagesVersionProcessor.name);

  constructor(
    private readonly pagesVersionRepository: PagesVersionRepository,
    private readonly pagesRepository: PagesRepository,
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
          'Страница или контент страницы не найден. Пропускаем.',
        );
        return;
      }

      const lastVersion =
        await this.pagesVersionRepository.findLatestByPageId(pageId);

      if (lastVersion && lastVersion.createdAt >= page.updatedAt) {
        this.logger.debug('Изменения не найдены. Пропускаем.');
        return;
      }

      await this.pagesVersionRepository.create({
        pageId,
        authorId,
        snapshot: page.content.json || {},
        label: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Ошибка создания автоснэпшота: ${errorMessage}`);
      throw error;
    }
  }
}
