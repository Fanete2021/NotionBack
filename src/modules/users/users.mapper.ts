import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersMapper {
  toEntity(user: User): UserEntity {
    return new UserEntity({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      avatarUrl: user.avatarUrl,
    });
  }
}
