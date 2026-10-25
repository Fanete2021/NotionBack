import { Injectable } from '@nestjs/common';
import { NotificationSettings } from '@prisma/client';
import { PrismaService } from '../../prisma';

export type NotificationSettingsData = Partial<
  Pick<
    NotificationSettings,
    | 'eventReminders'
    | 'dailySummary'
    | 'taskUpdates'
    | 'scheduleConflicts'
    | 'reminderMinutes'
    | 'quietHoursEnabled'
    | 'quietHoursStart'
    | 'quietHoursEnd'
  >
>;

@Injectable()
export class NotificationSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: string): Promise<NotificationSettings | null> {
    return this.prisma.notificationSettings.findUnique({ where: { userId } });
  }

  upsert(
    userId: string,
    data: NotificationSettingsData,
  ): Promise<NotificationSettings> {
    return this.prisma.notificationSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
