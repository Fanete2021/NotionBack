import { Injectable } from '@nestjs/common';
import { NotificationSettings } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NotificationSettingsRepository } from './notification-settings.repository';
import { NotificationSettingsEntity } from './entities';
import { UpdateNotificationSettingsDto } from './dto';
import { DEFAULT_REMINDER_MINUTES } from './consts';

@Injectable()
export class NotificationSettingsService {
  constructor(
    private readonly repository: NotificationSettingsRepository,
    @InjectPinoLogger(NotificationSettingsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async getSettings(userId: string): Promise<NotificationSettingsEntity> {
    const settings = await this.repository.findByUser(userId);
    return settings ? toEntity(settings) : defaultEntity();
  }

  async updateSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsEntity> {
    const settings = await this.repository.upsert(userId, { ...dto });

    this.logger.info(
      { action: 'notification_settings_update', userId },
      'notification settings updated',
    );

    return toEntity(settings);
  }
}

function toEntity(s: NotificationSettings): NotificationSettingsEntity {
  return new NotificationSettingsEntity({
    eventReminders: s.eventReminders,
    dailySummary: s.dailySummary,
    taskUpdates: s.taskUpdates,
    scheduleConflicts: s.scheduleConflicts,
    reminderMinutes: s.reminderMinutes,
    quietHoursEnabled: s.quietHoursEnabled,
    quietHoursStart: s.quietHoursStart,
    quietHoursEnd: s.quietHoursEnd,
  });
}

function defaultEntity(): NotificationSettingsEntity {
  return new NotificationSettingsEntity({
    eventReminders: true,
    dailySummary: false,
    taskUpdates: false,
    scheduleConflicts: false,
    reminderMinutes: DEFAULT_REMINDER_MINUTES,
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
  });
}
