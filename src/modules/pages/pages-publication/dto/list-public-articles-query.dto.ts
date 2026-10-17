import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  PUBLIC_ARTICLES_DEFAULT_LIMIT,
  PUBLIC_ARTICLES_MAX_LIMIT,
} from '../consts';

export class ListPublicArticlesQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Id последней статьи предыдущей страницы',
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({
    default: PUBLIC_ARTICLES_DEFAULT_LIMIT,
    minimum: 1,
    maximum: PUBLIC_ARTICLES_MAX_LIMIT,
    description: 'Размер страницы',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PUBLIC_ARTICLES_MAX_LIMIT)
  limit?: number;
}
