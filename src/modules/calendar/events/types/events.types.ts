type CreateEventData = {
  title: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  projectId: string | null;
  reminderMinutes: number | null;
  telegramReminder: boolean;
  reminderUserId: string | null;
};

type UpdateEventData = Partial<CreateEventData> & {
  isCompleted?: boolean;
};

type ListEventsFilter = {
  from?: Date;
  to?: Date;
  projectId?: string;
};

export type { CreateEventData, UpdateEventData, ListEventsFilter };
