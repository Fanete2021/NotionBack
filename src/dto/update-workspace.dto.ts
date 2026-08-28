import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({
    example: 'My renamed workspace',
    description: 'Название воркспейса',
  })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Workspace name must not be empty' })
  name?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Публичный ли воркспейс',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
