import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TelegramStatusEntity {
  @ApiProperty({ example: true, description: 'Привязан ли Telegram-аккаунт' })
  readonly isConnected: boolean;

  @ApiPropertyOptional({
    example: 'alex_kim',
    description: 'Telegram-username привязанного аккаунта',
    nullable: true,
  })
  readonly username: string | null;

  @ApiPropertyOptional({
    example: '2026-10-25T12:00:00.000Z',
    description: 'Когда был привязан аккаунт',
    nullable: true,
  })
  readonly connectedAt: Date | null;

  constructor(props: {
    isConnected: boolean;
    username: string | null;
    connectedAt: Date | null;
  }) {
    this.isConnected = props.isConnected;
    this.username = props.username;
    this.connectedAt = props.connectedAt;
  }
}
