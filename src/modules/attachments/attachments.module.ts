import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PagesModule } from '../pages/pages.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsRepository } from './attachments.repository';
import { AttachmentsService } from './attachments.service';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [PrismaModule, PagesModule, WorkspacesModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsRepository, S3StorageService],
})
export class AttachmentsModule {}
