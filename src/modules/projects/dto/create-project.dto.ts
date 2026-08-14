import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Work', description: 'Project name' })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  name!: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Parent project id (for nesting)',
  })
  @IsOptional()
  @IsString()
  parentProjectId?: string;

  @ApiPropertyOptional({ example: '#ff6347', description: 'Project color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: '📁', description: 'Project icon' })
  @IsOptional()
  @IsString()
  icon?: string;
}
