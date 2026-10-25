import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma';
import { TelegramController } from './telegram.controller';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramService } from './telegram.service';
import { TelegramApiService } from './telegram-api.service';
import { TelegramRepository } from './telegram.repository';

@Module({
  imports: [PrismaModule],
  controllers: [TelegramController, TelegramWebhookController],
  providers: [TelegramService, TelegramApiService, TelegramRepository],
  exports: [TelegramApiService],
})
export class TelegramModule {}
