import { Module } from '@nestjs/common';
import { PageCommentsController } from './page-comments.controller';
import { PageCommentsService } from './page-comments.service';
import { PageCommentsRepository } from './page-comments.repository';
import { PageCommentMapper } from './page-comment.mapper';
import { PrismaModule } from '../../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [PageCommentsController],
  providers: [PageCommentsService, PageCommentsRepository, PageCommentMapper],
})
export class PageCommentsModule {}
