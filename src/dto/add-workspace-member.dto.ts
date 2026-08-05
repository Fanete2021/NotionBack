import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddWorkspaceMemberDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'User id to add to the workspace',
  })
  @IsString()
  @IsNotEmpty({ message: 'User id is required' })
  userId!: string;

  @ApiPropertyOptional({
    enum: Role,
    default: Role.EDITOR,
    description: 'Role to assign to the new member',
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be a valid role' })
  role?: Role;
}
