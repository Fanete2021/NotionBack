import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PageType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePageDto {
  @ApiProperty({ example: 'Введение', description: 'Page title' })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Page title is required' })
  title!: string;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Workspace id the page belongs to',
  })
  @IsString()
  @IsNotEmpty({ message: 'Workspace id is required' })
  workspaceId!: string;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Project id the page is placed in',
  })
  @IsString()
  @IsNotEmpty({ message: 'Project id is required' })
  projectId!: string;

  @ApiPropertyOptional({
    enum: PageType,
    default: PageType.DOC,
    description: 'Page type',
  })
  @IsOptional()
  @IsEnum(PageType, { message: 'Page type must be DOC or ARTICLE' })
  type?: PageType;
}
