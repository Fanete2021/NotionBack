import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { WorkspaceMemberUserEntity } from './workspace-member-user.entity';

export class WorkspaceMemberEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ enum: Role })
  readonly role: Role;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly createdAt: Date;

  @ApiPropertyOptional({ type: WorkspaceMemberUserEntity })
  readonly userInfo?: WorkspaceMemberUserEntity;

  constructor(
    id: string,
    role: Role,
    createdAt: Date,
    userInfo?: WorkspaceMemberUserEntity,
  ) {
    this.id = id;
    this.role = role;
    this.createdAt = createdAt;
    this.userInfo = userInfo;
  }
}
