import { Module } from '@nestjs/common';
import { PageCommentsController } from '@modules/page-comments/page-comments.controller';
import { PageCommentsService } from '@modules/page-comments/page-comments.service';
import { PageCommentsRepository } from '@modules/page-comments/page-comments.repository';
import { PrismaModule } from '../../prisma';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { PagesModule } from '@modules/pages/pages.module';

@Module({
  imports: [PrismaModule, WorkspacesModule, PagesModule],
  controllers: [PageCommentsController],
  providers: [PageCommentsService, PageCommentsRepository],
})
export class PageCommentsModule {}
