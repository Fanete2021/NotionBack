import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_ANCHOR_ID_LENGTH } from '../constants';

export class ListPageCommentsQueryDto {
  @ApiPropertyOptional({ example: 'anchor-mark-uuid' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ANCHOR_ID_LENGTH)
  anchorId?: string;

  @ApiPropertyOptional({
    example: 'false',
    enum: ['true', 'false'],
    description: 'Фильтр по статусу «решён»',
  })
  @IsOptional()
  @IsIn(['true', 'false'], {
    message: 'resolved must be true or false',
  })
  resolved?: 'true' | 'false';
}
