import { Injectable, ConflictException } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(data: {
    email: string;
    passwordHash: string;
    name: string;
    avatarUrl?: string;
  }): Promise<UserEntity> {
    const existingUser = await this.usersRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    return this.usersRepository.create(data);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findById(id);
  }
}
