import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({
    description: 'Refresh токен, полученный при логине',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  refreshToken!: string;
}
