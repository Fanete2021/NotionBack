import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../../workspaces/workspaces.module';
import { PagesModule } from '../pages.module';
import { PagesPublicationController } from './pages-publication.controller';
import { PagesPublicationRepository } from './pages-publication.repository';
import { PagesPublicationService } from './pages-publication.service';

@Module({
  imports: [PagesModule, WorkspacesModule],
  controllers: [PagesPublicationController],
  providers: [PagesPublicationService, PagesPublicationRepository],
})
export class PagesPublicationModule {}
