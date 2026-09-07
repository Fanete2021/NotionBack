import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { WorkspaceInviteType } from '../types/workspace-invite.types';

export class WorkspaceInviteSummaryEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly workspaceId: string;

  @ApiProperty({
    enum: WorkspaceInviteType,
    description:
      'Invite lifetime. Listed invites are always PERMANENT: temporary links live in Redis and are not listed',
  })
  readonly type: WorkspaceInviteType;

  @ApiProperty({ enum: Role, description: 'Role granted on redemption' })
  readonly role: Role;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Id of the user who created the link',
  })
  readonly createdBy: string;

  @ApiProperty({ example: '2026-08-23T00:00:00.000Z' })
  readonly createdAt: Date;

  constructor(
    id: string,
    workspaceId: string,
    type: WorkspaceInviteType,
    role: Role,
    createdBy: string,
    createdAt: Date,
  ) {
    this.id = id;
    this.workspaceId = workspaceId;
    this.type = type;
    this.role = role;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
  }
}
