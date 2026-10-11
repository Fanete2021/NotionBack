import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './dto';
import { UserEntity } from './user.entity';
import { UsersMapper } from './users.mapper';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersMapper: UsersMapper,
  ) {}

  async findOne(userId: string) {
    return this.usersRepository.findById(userId);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserEntity> {
    const user = await this.usersRepository.update(userId, dto);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.usersMapper.toEntity(user);
  }
}
