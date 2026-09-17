import { Module } from '@nestjs/common';
import { PageCommentsController } from '@modules/page-comments/page-comments.controller';
import { PageCommentsService } from '@modules/page-comments/page-comments.service';
import { PageCommentsRepository } from '@modules/page-comments/page-comments.repository';
import { PrismaModule } from '../../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [PageCommentsController],
  providers: [PageCommentsService, PageCommentsRepository],
})
export class PageCommentsModule {}
