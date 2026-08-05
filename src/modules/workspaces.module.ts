import { Module } from '@nestjs/common';
import { WorkspacesController } from '../controllers/workspaces.controller';
import { WorkspacesService } from '../services/workspaces.service';
import { WorkspacesRepository } from '../repositories/workspaces.repository';
import { UsersModule } from './users.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspacesRepository],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
