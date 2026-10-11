type CreateEventData = {
  title: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  projectId: string | null;
};

type UpdateEventData = Partial<CreateEventData>;

type ListEventsFilter = {
  from?: Date;
  to?: Date;
  projectId?: string;
};

export type { CreateEventData, UpdateEventData, ListEventsFilter };
