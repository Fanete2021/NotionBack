import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    example: ['поле должно быть строкой', 'поле обязательно'],
    description: 'Сообщение об ошибке (строка или массив строк)',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message!: string | string[];

  @ApiProperty({ example: 'BadRequestException' })
  error!: string;

  @ApiProperty({ example: '/api/auth/register' })
  path!: string;

  @ApiProperty({ example: '2026-08-22T19:28:56.000Z' })
  timestamp!: string;
}
