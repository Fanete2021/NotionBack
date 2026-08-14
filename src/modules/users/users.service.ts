import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UserEntity } from './user.entity';
import { CreateUserData } from './types/users.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(data: CreateUserData): Promise<UserEntity> {
    return this.usersRepository.create(data);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findById(id);
  }
}
