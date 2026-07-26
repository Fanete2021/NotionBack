import { Module } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { UsersRepository } from '../repositories/users.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
