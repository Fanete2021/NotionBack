import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum PageSearchType {
  ALL = 'all',
  DOCUMENTS = 'documents',
  CONTENT = 'content',
}

export const SEARCH_MIN_QUERY_LENGTH = 3;
export const SEARCH_MAX_QUERY_LENGTH = 200;
export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 50;

export class SearchPagesQueryDto {
  @ApiProperty({ example: 'отчёт', description: 'Поисковый запрос' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(SEARCH_MIN_QUERY_LENGTH)
  @MaxLength(SEARCH_MAX_QUERY_LENGTH)
  q!: string;

  @ApiPropertyOptional({
    enum: PageSearchType,
    default: PageSearchType.ALL,
    description: 'documents - по заголовкам, content - по содержимому',
  })
  @IsOptional()
  @IsEnum(PageSearchType)
  type?: PageSearchType;

  @ApiPropertyOptional({ description: 'Ограничить поиск проектом' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Искать документы, обновлённые не раньше этой даты',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    description: 'Искать документы, обновлённые не позже этой даты',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({
    default: SEARCH_DEFAULT_LIMIT,
    maximum: SEARCH_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SEARCH_MAX_LIMIT)
  limit?: number;
}
