import { Injectable } from '@nestjs/common';
import { CalendarEvent } from '@prisma/client';
import { EventEntity } from './entities';

@Injectable()
export class EventsMapper {
  toEntity(event: CalendarEvent): EventEntity {
    return new EventEntity({
      id: event.id,
      workspaceId: event.workspaceId,
      projectId: event.projectId,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      allDay: event.allDay,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    });
  }

  toEntities(events: CalendarEvent[]): EventEntity[] {
    return events.map((event) => this.toEntity(event));
  }
}
