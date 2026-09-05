import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Work', description: 'Название проекта' })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  name!: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID родительского проекта (для вложенности)',
  })
  @IsOptional()
  @IsUUID('4')
  parentProjectId?: string;

  @ApiPropertyOptional({ example: '#ff6347', description: 'Цвет проекта' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: '📁', description: 'Иконка проекта' })
  @IsOptional()
  @IsString()
  icon?: string;
}
