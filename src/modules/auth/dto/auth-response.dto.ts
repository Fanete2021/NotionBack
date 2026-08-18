import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ description: 'ID пользователя', example: 'uuid-string' })
  id!: string;

  @ApiProperty({
    description: 'Email пользователя',
    example: 'user@example.com',
  })
  email!: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT Access Token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({ description: 'Данные пользователя', type: UserDto })
  user!: UserDto;
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Сообщение о результате операции',
    example: 'Успешная операция',
  })
  message!: string;
}
