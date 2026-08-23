import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RedeemInviteDto {
  @ApiProperty({
    example: 'qU5f_1zXvR2kLmN8pQa',
    description: 'Token from the invite link',
  })
  @IsString()
  @IsNotEmpty({ message: 'Invite token is required' })
  token!: string;
}
