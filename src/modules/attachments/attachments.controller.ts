import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AttachmentsService } from './attachments.service';
import { ApiConfirmAttachment, ApiPresignAttachment } from './decorators';
import { PresignAttachmentDto } from './dto';
import { AttachmentEntity, PresignAttachmentResultEntity } from './entities';

@ApiBearerAuth()
@ApiTags('Attachments')
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('presign')
  @ApiPresignAttachment()
  async presign(
    @CurrentUser('id') userId: string,
    @Body() dto: PresignAttachmentDto,
  ): Promise<PresignAttachmentResultEntity> {
    return this.attachmentsService.presign(userId, dto);
  }

  @Post(':id/confirm')
  @ApiConfirmAttachment()
  async confirm(
    @CurrentUser('id') userId: string,
    @Param('id') attachmentId: string,
  ): Promise<AttachmentEntity> {
    return this.attachmentsService.confirm(userId, attachmentId);
  }
}
