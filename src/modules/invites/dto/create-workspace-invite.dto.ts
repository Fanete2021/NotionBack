import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { InviteType } from '../types/invite.types';

export class CreateWorkspaceInviteDto {
  @ApiProperty({
    enum: InviteType,
    description:
      'TEMPORARY link lives 24 hours in Redis and is single-use, PERMANENT is stored in the database',
  })
  @IsEnum(InviteType, { message: 'Type must be TEMPORARY or PERMANENT' })
  type!: InviteType;

  @ApiPropertyOptional({
    enum: [Role.VIEWER, Role.EDITOR],
    default: Role.EDITOR,
    description: 'Role granted to users joining via this link',
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be a valid role' })
  role?: Role;
}
