import { Module } from '@nestjs/common';
import { UsersRepository } from '@modules/users/users.repository';
import { PrismaModule } from '../../prisma';

@Module({
  imports: [PrismaModule],
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
