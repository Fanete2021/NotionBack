import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { WorkspaceInviteType } from '../types/workspace-invite.types';

export class CreateWorkspaceInviteDto {
  @ApiProperty({
    enum: WorkspaceInviteType,
    description:
      'TEMPORARY link lives 24 hours in Redis and is single-use, PERMANENT is stored in the database',
  })
  @IsEnum(WorkspaceInviteType, {
    message: 'Type must be TEMPORARY or PERMANENT',
  })
  type!: WorkspaceInviteType;

  @ApiPropertyOptional({
    enum: [Role.VIEWER, Role.EDITOR],
    default: Role.VIEWER,
    description:
      'Role granted to users joining via this link, defaults to the most restricted one',
  })
  @IsOptional()
  @IsIn([Role.VIEWER, Role.EDITOR], {
    message: 'Role must be VIEWER or EDITOR',
  })
  role?: Role;
}
