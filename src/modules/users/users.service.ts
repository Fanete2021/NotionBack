import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersMapper } from './users.mapper';
import { UserEntity } from './user.entity';
import { UpdateProfileDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersMapper: UsersMapper,
  ) {}

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
