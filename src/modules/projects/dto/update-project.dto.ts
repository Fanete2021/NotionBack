import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Personal', description: 'Название проекта' })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Project name must not be empty' })
  name?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID родительского проекта (null — в корень)',
  })
  @IsOptional()
  @IsUUID('4')
  parentProjectId?: string | null;

  @ApiPropertyOptional({ example: '#3b82f6', description: 'Цвет проекта' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: '🎯', description: 'Иконка проекта' })
  @IsOptional()
  @IsString()
  icon?: string;
}
