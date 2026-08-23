import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AttachmentEntity } from './entities/attachment.entity';
import { PresignAttachmentResultEntity } from './entities/presign-attachment-result.entity';
import { PresignAttachmentDto } from './dto/presign-attachment.dto';
import { AttachmentsService } from './attachments.service';

@ApiBearerAuth()
@ApiTags('Attachments')
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('presign')
  @ApiOperation({
    summary:
      'Get a presigned upload url for an image/video attachment (workspace member)',
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned upload url created',
    type: PresignAttachmentResultEntity,
  })
  @ApiResponse({ status: 400, description: 'Content type not allowed' })
  @ApiResponse({
    status: 403,
    description: 'Not a member of the workspace',
  })
  @ApiResponse({ status: 404, description: 'Page not found' })
  @ApiResponse({ status: 413, description: 'File is too large' })
  async presign(
    @CurrentUser('id') userId: string,
    @Body() dto: PresignAttachmentDto,
  ): Promise<PresignAttachmentResultEntity> {
    return this.attachmentsService.presign(
      userId,
      dto.pageId,
      dto.fileName,
      dto.contentType,
      dto.size,
    );
  }

  @Post(':id/confirm')
  @ApiOperation({
    summary:
      'Confirm a finished upload (uploader only). Verifies the real file in storage and marks the attachment CONFIRMED',
  })
  @ApiParam({ name: 'id', type: String, description: 'Attachment id' })
  @ApiResponse({
    status: 201,
    description: 'Attachment confirmed',
    type: AttachmentEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'File not uploaded yet or content type mismatch',
  })
  @ApiResponse({
    status: 403,
    description: 'Only the uploader can confirm',
  })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @ApiResponse({
    status: 413,
    description: 'Uploaded file exceeds the size limit',
  })
  async confirm(
    @CurrentUser('id') userId: string,
    @Param('id') attachmentId: string,
  ): Promise<AttachmentEntity> {
    return this.attachmentsService.confirm(userId, attachmentId);
  }
}
