import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { WorkspaceInviteType } from '@modules/workspace-invites/types';

export class WorkspaceInviteEntity {
  @ApiProperty({
    example: 'qU5f_1zXvR2kLmN8pQaBcDdEeFfGgHhIiJjKkLlMmNnOo',
    description: 'Токен приглашения для формирования ссылки',
  })
  readonly token: string;

  @ApiProperty({
    example: 'http://localhost:3000/join/qU5f_1zXvR2kLmN8pQa',
    description: 'Полная ссылка-приглашение для отправки',
  })
  readonly url: string;

  @ApiProperty({ enum: WorkspaceInviteType })
  readonly type: WorkspaceInviteType;

  @ApiProperty({ enum: Role, description: 'Роль, выдаваемая при активации' })
  readonly role: Role;

  @ApiProperty({
    type: Date,
    nullable: true,
    example: '2026-08-24T00:00:00.000Z',
    description: 'Время истечения для временных ссылок, null для постоянных',
  })
  readonly expiresAt: Date | null;

  constructor(
    token: string,
    url: string,
    type: WorkspaceInviteType,
    role: Role,
    expiresAt: Date | null,
  ) {
    this.token = token;
    this.url = url;
    this.type = type;
    this.role = role;
    this.expiresAt = expiresAt;
  }
}
