import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { MAX_COMMENT_BODY_LENGTH } from '@modules/page-comments/constants';

export class UpdatePageCommentDto {
  @ApiProperty({ example: 'Обновлённый текст комментария.' })
  @IsString()
  @MaxLength(MAX_COMMENT_BODY_LENGTH)
  body!: string;
}
