import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { WorkspaceInviteType } from '@modules/workspace-invites/types';

export class CreateWorkspaceInviteDto {
  @ApiProperty({
    enum: WorkspaceInviteType,
    description:
      'TEMPORARY живёт 24 часа в Redis и одноразовая, PERMANENT хранится в базе',
  })
  @IsEnum(WorkspaceInviteType, {
    message: 'Type must be TEMPORARY or PERMANENT',
  })
  type!: WorkspaceInviteType;

  @ApiPropertyOptional({
    enum: [Role.VIEWER, Role.EDITOR],
    default: Role.VIEWER,
    description:
      'Роль для пользователей, вступающих по этой ссылке; по умолчанию — самая ограниченная',
  })
  @IsOptional()
  @IsIn([Role.VIEWER, Role.EDITOR], {
    message: 'Role must be VIEWER or EDITOR',
  })
  role?: Role;
}
