import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: Role,
    example: Role.ADMIN,
    description: 'New role for the member',
  })
  @IsEnum(Role, { message: 'Role must be a valid role' })
  role!: Role;
}
