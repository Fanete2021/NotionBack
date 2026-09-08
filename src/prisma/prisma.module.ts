import { Global, Module } from '@nestjs/common';
import { PrismaService } from '.';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
