import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PublicationStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  SEO_DESCRIPTION_MAX_LENGTH,
  SEO_TITLE_MAX_LENGTH,
  SLUG_MAX_LENGTH,
} from '../consts';

export class PublishPageDto {
  @ApiPropertyOptional({ example: 'vvedenie', description: 'Публичный slug' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Slug must not be empty' })
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain lowercase letters, digits and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Введение в проект' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'SEO title must not be empty' })
  @MaxLength(SEO_TITLE_MAX_LENGTH)
  seoTitle?: string;

  @ApiPropertyOptional({ example: 'Короткое описание для карточки ленты' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'SEO description must not be empty' })
  @MaxLength(SEO_DESCRIPTION_MAX_LENGTH)
  seoDescription?: string;

  @ApiProperty({
    enum: PublicationStatus,
    example: PublicationStatus.PUBLISHED,
  })
  @IsEnum(PublicationStatus, {
    message: 'Status must be DRAFT, PUBLISHED or HIDDEN',
  })
  status!: PublicationStatus;
}
