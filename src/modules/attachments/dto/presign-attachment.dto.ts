import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class PresignAttachmentDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Page the attachment belongs to',
  })
  @IsUUID('4', { message: 'Page id must be a valid UUID' })
  pageId!: string;

  @ApiProperty({ example: 'cat.png' })
  @IsString()
  @IsNotEmpty({ message: 'File name is required' })
  @MaxLength(255, { message: 'File name is too long' })
  fileName!: string;

  @ApiProperty({
    example: 'image/png',
    description:
      'MIME type. Allowed: image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm, video/quicktime',
  })
  @IsString()
  @IsNotEmpty({ message: 'Content type is required' })
  contentType!: string;

  @ApiProperty({ example: 3145728, minimum: 1 })
  @IsInt()
  size!: number;
}
