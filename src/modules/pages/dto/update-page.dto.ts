import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PageType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdatePageDto {
  @ApiPropertyOptional({
    example: 'Введение',
    description: 'Заголовок документа',
  })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Page title must not be empty' })
  title?: string;

  @ApiPropertyOptional({ example: '📄', description: 'Иконка документа' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    enum: PageType,
    description: 'Тип документа',
  })
  @IsOptional()
  @IsEnum(PageType, { message: 'Page type must be DOC or ARTICLE' })
  type?: PageType;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Id проекта, в который нужно переместить документ',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Project id must be a valid UUID' })
  projectId?: string;
}
