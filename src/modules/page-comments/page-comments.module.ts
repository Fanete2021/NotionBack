import { Module } from '@nestjs/common';
import { PageCommentsController } from './page-comments.controller';
import { PageCommentsService } from './page-comments.service';
import { PageCommentsAccessService } from './page-comments-access.service';
import { PageCommentsRealtimeService } from './page-comments-realtime.service';
import { PageCommentsRepository } from './page-comments.repository';
import { PageCommentMapper } from './page-comment.mapper';
import { PrismaModule } from '../../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [PageCommentsController],
  providers: [
    PageCommentsService,
    PageCommentsAccessService,
    PageCommentsRealtimeService,
    PageCommentsRepository,
    PageCommentMapper,
  ],
  exports: [PageCommentsRealtimeService],
})
export class PageCommentsModule {}
