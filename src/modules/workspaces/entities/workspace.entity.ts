import { ApiProperty } from '@nestjs/swagger';

export interface WorkspaceEntityData {
  id: string;
  name: string;
  ownerId: string;
  isPublic: boolean;
  createdAt: Date;
}

export class WorkspaceEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: 'My workspace' })
  readonly name: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly ownerId: string;

  @ApiProperty({ example: false })
  readonly isPublic: boolean;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly createdAt: Date;

  constructor(data: WorkspaceEntityData) {
    this.id = data.id;
    this.name = data.name;
    this.ownerId = data.ownerId;
    this.isPublic = data.isPublic;
    this.createdAt = data.createdAt;
  }
}
