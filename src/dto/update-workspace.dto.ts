import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({
    example: 'My renamed workspace',
    description: 'Workspace name',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Workspace name must not be empty' })
  name?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the workspace is public',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
