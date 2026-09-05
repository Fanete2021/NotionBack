import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: Role,
    example: Role.ADMIN,
    description: 'Новая роль участника',
  })
  @IsEnum(Role, { message: 'Role must be a valid role' })
  role!: Role;
}
