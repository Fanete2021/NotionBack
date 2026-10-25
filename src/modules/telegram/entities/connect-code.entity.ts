import { ApiProperty } from '@nestjs/swagger';

export class ConnectCodeEntity {
  @ApiProperty({
    example: 'a1B2c3D4e5F6g7H8',
    description: 'Одноразовый код для привязки Telegram',
  })
  readonly code: string;

  @ApiProperty({
    example: 'https://t.me/my_notion_bot?start=a1B2c3D4e5F6g7H8',
    description:
      'Deep-link: откройте его в Telegram и нажмите «Start», чтобы привязать аккаунт. null — если имя бота не настроено на сервере.',
    nullable: true,
  })
  readonly deepLink: string | null;

  @ApiProperty({
    example: '2026-10-25T12:15:00.000Z',
    description: 'Время истечения кода (ISO 8601)',
  })
  readonly expiresAt: Date;

  constructor(props: {
    code: string;
    deepLink: string | null;
    expiresAt: Date;
  }) {
    this.code = props.code;
    this.deepLink = props.deepLink;
    this.expiresAt = props.expiresAt;
  }
}
