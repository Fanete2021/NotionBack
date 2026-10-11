import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../../workspaces/workspaces.module';
import { PagesModule } from '../pages.module';
import {
  PagesPublicationController,
  PublicArticlesController,
} from './pages-publication.controller';
import { PagesPublicationRepository } from './pages-publication.repository';
import { PagesPublicationService } from './pages-publication.service';

@Module({
  imports: [PagesModule, WorkspacesModule],
  controllers: [PagesPublicationController, PublicArticlesController],
  providers: [PagesPublicationService, PagesPublicationRepository],
})
export class PagesPublicationModule {}
