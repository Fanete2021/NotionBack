import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'My workspace', description: 'Workspace name' })
  @IsString()
  @IsNotEmpty({ message: 'Workspace name is required' })
  name!: string;
}
