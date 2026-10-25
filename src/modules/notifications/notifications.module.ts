import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma';
import { TelegramModule } from '@modules/telegram/telegram.module';
import { NotificationsController } from './notifications.controller';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationSettingsRepository } from './notification-settings.repository';
import { EventRemindersService } from './event-reminders.service';
import { EventRemindersProcessor } from './event-reminders.processor';
import { EVENT_REMINDERS_QUEUE } from './consts';

@Module({
  imports: [
    PrismaModule,
    TelegramModule,
    BullModule.registerQueue({
      name: EVENT_REMINDERS_QUEUE,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationSettingsService,
    NotificationSettingsRepository,
    EventRemindersService,
    EventRemindersProcessor,
  ],
  exports: [EventRemindersService],
})
export class NotificationsModule {}
