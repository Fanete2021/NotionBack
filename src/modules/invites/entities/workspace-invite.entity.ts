import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InviteType } from '../types/invite.types';

export class WorkspaceInviteEntity {
  @ApiProperty({
    example: 'qU5f_1zXvR2kLmN8pQaBcDdEeFfGgHhIiJjKkLlMmNnOo',
    description: 'Invite token used to build the shareable link',
  })
  readonly token: string;

  @ApiProperty({
    example: 'http://localhost:3000/join/qU5f_1zXvR2kLmN8pQa',
    description: 'Full invite link for sharing',
  })
  readonly url: string;

  @ApiProperty({ enum: InviteType })
  readonly type: InviteType;

  @ApiProperty({ enum: Role, description: 'Role granted on redemption' })
  readonly role: Role;

  @ApiProperty({
    type: Date,
    nullable: true,
    example: '2026-08-24T00:00:00.000Z',
    description: 'Expiration time for temporary invites, null for permanent',
  })
  readonly expiresAt: Date | null;

  constructor(
    token: string,
    url: string,
    type: InviteType,
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
