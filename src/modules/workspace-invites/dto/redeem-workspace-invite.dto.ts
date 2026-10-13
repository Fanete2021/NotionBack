import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RedeemWorkspaceInviteDto {
  @ApiProperty({
    example: 'qU5f_1zXvR2kLmN8pQa',
    description: 'Токен из ссылки-приглашения',
  })
  @IsString()
  @IsNotEmpty({ message: 'Invite token is required' })
  token!: string;
}
