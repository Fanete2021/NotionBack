import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class WorkspaceMemberUserEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: 'Иван Иванов' })
  readonly name: string;

  @ApiProperty({ example: 'user@example.com' })
  readonly email: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  readonly avatarUrl?: string | null;

  constructor(props: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.avatarUrl = props.avatarUrl;
  }
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

  @ApiPropertyOptional({ type: WorkspaceMemberUserEntity })
  readonly user?: WorkspaceMemberUserEntity;

  constructor(
    id: string,
    workspaceId: string,
    userId: string,
    role: Role,
    createdAt: Date,
    user?: WorkspaceMemberUserEntity,
  ) {
    this.id = id;
    this.workspaceId = workspaceId;
    this.userId = userId;
    this.role = role;
    this.createdAt = createdAt;
    this.user = user;
  }
}
