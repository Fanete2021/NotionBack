import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserEntity } from './user.entity';
import { User } from '@prisma/client';
import { CreateUserData } from './types/users.types';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<UserEntity> {
    const user = await this.prisma.user.create({ data });

    return this.mapToEntity(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return this.mapToEntity(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return this.mapToEntity(user);
  }

  private mapToEntity(user: User): UserEntity {
    return new UserEntity(
      user.id,
      user.email,
      user.passwordHash,
      user.name,
      user.createdAt,
      user.updatedAt,
      user.avatarUrl,
    );
  }
}
