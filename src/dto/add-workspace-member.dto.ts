import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddWorkspaceMemberDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'User id to add to the workspace',
  })
  @IsString()
  @IsNotEmpty({ message: 'User id is required' })
  userId!: string;
}
