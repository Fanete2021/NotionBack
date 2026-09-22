import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../../../modules/workspaces/workspaces.module';
import { PagesVersionModule } from '../pages-version';
import { PagesModule } from '../pages.module';
import { PagesContentMapper } from './page-content.mapper';
import { PagesContentController } from './pages-content.controller';
import { PagesContentRepository } from './pages-content.repository';
import { PagesContentService } from './pages-content.service';

@Module({
  imports: [PagesModule, PagesVersionModule, WorkspacesModule],
  controllers: [PagesContentController],
  providers: [PagesContentService, PagesContentRepository, PagesContentMapper],
})
export class PagesContentModule {}
