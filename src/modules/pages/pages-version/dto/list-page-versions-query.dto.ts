import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  PAGE_VERSIONS_DEFAULT_LIMIT,
  PAGE_VERSIONS_MAX_LIMIT,
} from '../consts';

export class ListPageVersionsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Id последней версии предыдущей страницы',
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({
    default: PAGE_VERSIONS_DEFAULT_LIMIT,
    minimum: 1,
    maximum: PAGE_VERSIONS_MAX_LIMIT,
    description: 'Размер страницы',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGE_VERSIONS_MAX_LIMIT)
  limit?: number;
}
