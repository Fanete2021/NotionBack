import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class UserEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: 'user@example.com' })
  readonly email: string;

  @ApiHideProperty()
  @Exclude()
  readonly passwordHash: string;

  @ApiProperty({ example: 'Иван Иванов' })
  readonly name: string;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly createdAt: Date;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly updatedAt: Date;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  readonly avatarUrl?: string | null;

  constructor(props: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    avatarUrl?: string | null;
  }) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.name = props.name;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.avatarUrl = props.avatarUrl;
  }
}
