import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PagesModule } from '../pages/pages.module';
import { S3Module } from '../s3/s3.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsMapper } from './attachments.mapper';
import { AttachmentsRepository } from './attachments.repository';
import { AttachmentsService } from './attachments.service';

@Module({
  imports: [S3Module, PrismaModule, PagesModule, WorkspacesModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsRepository, AttachmentsMapper],
})
export class AttachmentsModule {}
