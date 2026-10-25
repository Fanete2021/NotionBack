import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { CalendarEvent } from '@prisma/client';
import { Job, Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma';
import { TelegramApiService } from '@modules/telegram/telegram-api.service';
import { NotificationSettingsRepository } from './notification-settings.repository';
import {
  EVENT_REMINDER_JOB,
  EVENT_REMINDERS_QUEUE,
  eventReminderDeferredJobId,
} from './consts';
import { EventReminderJobData } from './types';
import { isWithinQuietHours, nextQuietHoursEnd } from './utils/quiet-hours';

@Processor(EVENT_REMINDERS_QUEUE)
export class EventRemindersProcessor extends WorkerHost {
  constructor(
    @InjectQueue(EVENT_REMINDERS_QUEUE)
    private readonly queue: Queue<EventReminderJobData>,
    private readonly prisma: PrismaService,
    private readonly settingsRepository: NotificationSettingsRepository,
    private readonly telegramApi: TelegramApiService,
    @InjectPinoLogger(EventRemindersProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job<EventReminderJobData>): Promise<void> {
    const { eventId } = job.data;

    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return this.skip(eventId, 'event_deleted');
    }
    if (!event.telegramReminder || event.reminderMinutes == null) {
      return this.skip(eventId, 'reminder_disabled');
    }
    if (event.isCompleted) {
      return this.skip(eventId, 'event_completed');
    }

    const userId = event.reminderUserId;
    if (!userId) {
      return this.skip(eventId, 'no_reminder_user');
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: event.workspaceId, userId },
      },
      select: { id: true },
    });
    if (!member) {
      return this.skip(eventId, 'not_a_member');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });
    if (!user?.telegramChatId) {
      return this.skip(eventId, 'telegram_not_connected');
    }

    const settings = await this.settingsRepository.findByUser(userId);

    if (settings && !settings.eventReminders) {
      return this.skip(eventId, 'event_reminders_off');
    }

    const now = new Date();
    if (event.startAt.getTime() <= now.getTime()) {
      return this.skip(eventId, 'event_already_started');
    }

    if (
      settings?.quietHoursEnabled &&
      settings.quietHoursStart &&
      settings.quietHoursEnd &&
      isWithinQuietHours(now, settings.quietHoursStart, settings.quietHoursEnd)
    ) {
      await this.deferUntilQuietHoursEnd(eventId, now, settings.quietHoursEnd);
      return;
    }

    const sent = await this.telegramApi.sendMessage(
      user.telegramChatId,
      buildReminderText(event, now),
    );
    if (!sent) {
      return this.skip(eventId, 'telegram_not_configured');
    }

    this.logger.info(
      { action: 'event_reminder_sent', eventId, userId },
      'event reminder sent',
    );
  }

  private async deferUntilQuietHoursEnd(
    eventId: string,
    now: Date,
    quietEnd: string,
  ): Promise<void> {
    const resumeAt = nextQuietHoursEnd(now, quietEnd);
    const delay = resumeAt.getTime() - now.getTime();

    const pending = await this.queue.getJobs([
      'delayed',
      'waiting',
      'prioritized',
      'waiting-children',
    ]);
    await Promise.all(
      pending
        .filter((job) => job.data?.eventId === eventId)
        .map((job) => job.remove().catch(() => undefined)),
    );

    await this.queue.add(
      EVENT_REMINDER_JOB,
      { eventId },
      {
        jobId: eventReminderDeferredJobId(eventId, resumeAt.getTime()),
        delay,
      },
    );

    this.logger.debug(
      { action: 'event_reminder_deferred', eventId, resumeAt },
      'event reminder deferred due to quiet hours',
    );
  }

  private skip(eventId: string, reason: string): void {
    this.logger.debug(
      { action: 'event_reminder_skip', eventId, reason },
      'event reminder skipped',
    );
  }
}

function buildReminderText(event: CalendarEvent, now: Date): string {
  const title = escapeHtml(event.title);
  const minutes = Math.max(
    1,
    Math.ceil((event.startAt.getTime() - now.getTime()) / 60_000),
  );

  return [
    '🔔 <b>Напоминание о событии</b>',
    '',
    `<b>${title}</b>`,
    `🕒 Начало через ${minutes} мин — ${formatDateTime(event.startAt)}`,
  ].join('\n');
}

function formatDateTime(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)} в ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
