import { ApiProperty, PickType } from '@nestjs/swagger';
import { UserEntity } from '@modules/users/user.entity';

class AuthUserDto extends PickType(UserEntity, ['id', 'email'] as const) {}

class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access-токен',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({ description: 'Данные пользователя', type: AuthUserDto })
  user!: AuthUserDto;
}

class MessageResponseDto {
  @ApiProperty({
    description: 'Сообщение о результате операции',
    example: 'Успешная операция',
  })
  message!: string;
}

export { AuthUserDto, AuthResponseDto, MessageResponseDto };
