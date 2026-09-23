import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_ANCHOR_ID_LENGTH, MAX_COMMENT_BODY_LENGTH } from '../constants';

export class CreatePageCommentDto {
  @ApiProperty({ example: 'Нужно уточнить формулировку.' })
  @IsString()
  @MaxLength(MAX_COMMENT_BODY_LENGTH)
  body!: string;

  @ApiPropertyOptional({
    example: 'anchor-mark-uuid',
    description: 'Id mark/anchor в TipTap для комментария к фрагменту текста',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ANCHOR_ID_LENGTH)
  anchorId?: string;
}
