import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Почта пользователя',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @ApiProperty({
    example: 'password123',
    description: 'Пароль (минимум 6 символов)',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;

  @ApiProperty({ example: 'Иван Иванов', description: 'Имя пользователя' })
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'Ссылка на аватарку',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
