import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Personal', description: 'Project name' })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Project name must not be empty' })
  name?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Parent project id (null to move to root)',
  })
  @IsOptional()
  @IsString()
  parentProjectId?: string | null;

  @ApiPropertyOptional({ example: '#3b82f6', description: 'Project color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: '🎯', description: 'Project icon' })
  @IsOptional()
  @IsString()
  icon?: string;
}
