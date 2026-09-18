import { Module } from '@nestjs/common';
import { PageCommentsController } from './page-comments.controller';
import { PageCommentsService } from './page-comments.service';
import { PageCommentsRepository } from './page-comments.repository';
import { PrismaModule } from '../../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [PageCommentsController],
  providers: [PageCommentsService, PageCommentsRepository],
})
export class PageCommentsModule {}
