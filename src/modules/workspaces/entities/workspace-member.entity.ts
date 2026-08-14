import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export interface WorkspaceMemberEntityData {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  createdAt: Date;
}

export class WorkspaceMemberEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly workspaceId: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly userId: string;

  @ApiProperty({ enum: Role })
  readonly role: Role;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly createdAt: Date;

  constructor(data: WorkspaceMemberEntityData) {
    this.id = data.id;
    this.workspaceId = data.workspaceId;
    this.userId = data.userId;
    this.role = data.role;
    this.createdAt = data.createdAt;
  }
}
