import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_ANCHOR_ID_LENGTH } from '@modules/page-comments/constants';

export class ListPageCommentsQueryDto {
  @ApiPropertyOptional({ example: 'anchor-mark-uuid' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ANCHOR_ID_LENGTH)
  anchorId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  resolved?: boolean;
}
