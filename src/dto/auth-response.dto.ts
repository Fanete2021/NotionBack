import { ApiProperty, PickType } from '@nestjs/swagger';
import { UserEntity } from '../entities/user.entity';

export class AuthUserDto extends PickType(UserEntity, ['id', 'email'] as const) {}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT Access Token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({ description: 'Данные пользователя', type: AuthUserDto })
  user!: AuthUserDto;
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Сообщение о результате операции',
    example: 'Успешная операция',
  })
  message!: string;
}
