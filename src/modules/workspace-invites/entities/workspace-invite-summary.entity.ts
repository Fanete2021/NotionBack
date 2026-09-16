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
      'Срок жизни ссылки. PERMANENT-ссылки хранятся в базе, TEMPORARY — в Redis и истекают сами',
  })
  readonly type: WorkspaceInviteType;

  @ApiProperty({ enum: Role, description: 'Роль, выдаваемая при активации' })
  readonly role: Role;

  @ApiProperty({
    example: 'qU5f_1zXvR2kLmN8pQaBcDdEeFfGgHhIiJjKkLlMmNnOo',
    description: 'Токен приглашения для формирования ссылки',
  })
  readonly token: string;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Id пользователя, создавшего ссылку',
  })
  readonly createdBy: string;

  @ApiProperty({ example: '2026-08-23T00:00:00.000Z' })
  readonly createdAt: Date;

  @ApiProperty({
    type: Date,
    nullable: true,
    example: '2026-08-24T00:00:00.000Z',
    description: 'Время истечения для временных ссылок, null для постоянных',
  })
  readonly expiresAt: Date | null;

  constructor(
    id: string,
    workspaceId: string,
    type: WorkspaceInviteType,
    role: Role,
    createdBy: string,
    createdAt: Date,
    token: string,
    expiresAt: Date | null = null,
  ) {
    this.id = id;
    this.workspaceId = workspaceId;
    this.type = type;
    this.role = role;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.token = token;
    this.expiresAt = expiresAt;
  }
}
