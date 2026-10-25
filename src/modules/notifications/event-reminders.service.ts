import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { CalendarEvent } from '@prisma/client';
import { Job, Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  EVENT_REMINDER_JOB,
  EVENT_REMINDERS_QUEUE,
  eventReminderJobId,
} from './consts';
import { EventReminderJobData } from './types';

export type ReminderEventInput = Pick<
  CalendarEvent,
  'id' | 'startAt' | 'reminderMinutes' | 'telegramReminder' | 'reminderUserId'
>;

@Injectable()
export class EventRemindersService {
  constructor(
    @InjectQueue(EVENT_REMINDERS_QUEUE)
    private readonly queue: Queue<EventReminderJobData>,
    @InjectPinoLogger(EventRemindersService.name)
    private readonly logger: PinoLogger,
  ) {}

  async scheduleForEvent(event: ReminderEventInput): Promise<void> {
    await this.removeForEvent(event.id);

    if (
      !event.telegramReminder ||
      event.reminderMinutes == null ||
      !event.reminderUserId
    ) {
      return;
    }

    const fireAt = event.startAt.getTime() - event.reminderMinutes * 60_000;
    const delay = fireAt - Date.now();

    if (delay <= 0) {
      this.logger.debug(
        { action: 'event_reminder_skip_past', eventId: event.id },
        'reminder time already passed, not scheduled',
      );
      return;
    }

    await this.queue.add(
      EVENT_REMINDER_JOB,
      { eventId: event.id },
      { jobId: eventReminderJobId(event.id), delay },
    );

    this.logger.debug(
      { action: 'event_reminder_scheduled', eventId: event.id, delay },
      'event reminder scheduled',
    );
  }

  async removeForEvent(eventId: string): Promise<void> {
    try {
      await this.queue.remove(eventReminderJobId(eventId));
    } catch (error: unknown) {
      this.logger.debug(
        { action: 'event_reminder_remove_skip', eventId, err: error },
        'event reminder job was not removed',
      );
    }

    await this.removeDeferredJobs(eventId);
  }

  private async removeDeferredJobs(eventId: string): Promise<void> {
    const jobs = await this.queue.getJobs([
      'delayed',
      'waiting',
      'prioritized',
      'waiting-children',
    ]);

    await Promise.all(
      jobs
        .filter((job) => job.data?.eventId === eventId)
        .map((job) => this.removeJob(job)),
    );
  }

  private async removeJob(job: Job<EventReminderJobData>): Promise<void> {
    try {
      await job.remove();
    } catch (error: unknown) {
      this.logger.debug(
        { action: 'event_reminder_remove_skip', jobId: job.id, err: error },
        'event reminder job was not removed',
      );
    }
  }
}
