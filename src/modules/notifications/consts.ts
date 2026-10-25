export const EVENT_REMINDERS_QUEUE = 'event-reminders';
export const EVENT_REMINDER_JOB = 'event-reminder';

export const DEFAULT_REMINDER_MINUTES = 15;

export const eventReminderJobId = (eventId: string): string =>
  `event-reminder-${eventId}`;

export const eventReminderDeferredJobId = (
  eventId: string,
  resumeAtMs: number,
): string => `${eventReminderJobId(eventId)}:until:${resumeAtMs}`;
