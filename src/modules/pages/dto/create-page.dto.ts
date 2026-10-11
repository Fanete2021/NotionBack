import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PageType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePageDto {
  @ApiProperty({ example: 'Введение', description: 'Заголовок документа' })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Page title is required' })
  title!: string;

  @ApiPropertyOptional({ example: '📄', description: 'Иконка документа' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Id воркспейса, к которому относится документ',
  })
  @IsUUID('4', { message: 'Workspace id must be a valid UUID' })
  workspaceId!: string;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Id проекта, в котором находится документ',
  })
  @IsUUID('4', { message: 'Project id must be a valid UUID' })
  projectId!: string;

  @ApiPropertyOptional({
    enum: PageType,
    default: PageType.DOC,
    description: 'Тип документа',
  })
  @IsOptional()
  @IsEnum(PageType, { message: 'Page type must be DOC or ARTICLE' })
  type?: PageType;
}
