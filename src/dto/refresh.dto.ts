import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh токен, полученный при логине',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken!: string;
}
