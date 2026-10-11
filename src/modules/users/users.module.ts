import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma';
import { UsersController } from './users.controller';
import { UsersMapper } from './users.mapper';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersMapper, UsersService],
  exports: [UsersRepository, UsersService, UsersMapper],
})
export class UsersModule {}
