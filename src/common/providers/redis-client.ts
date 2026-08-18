import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisClient extends Redis implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    super({
      host: configService.get<string>('REDIS_HOST'),
      port: configService.get<number>('REDIS_PORT'),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
  }
}
