import { Injectable } from '@nestjs/common';
import { CalendarEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma';
import { CreateEventData, ListEventsFilter, UpdateEventData } from './types';
import { isNotFoundError } from '@common/utils';

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(workspaceId: string, data: CreateEventData): Promise<CalendarEvent> {
    return this.prisma.calendarEvent.create({
      data: { ...data, workspaceId },
    });
  }

  findAllByWorkspaceId(
    workspaceId: string,
    filter: ListEventsFilter,
  ): Promise<CalendarEvent[]> {
    const where: Prisma.CalendarEventWhereInput = { workspaceId };

    if (filter.projectId) {
      where.projectId = filter.projectId;
    }

    if (filter.to) {
      where.startAt = { lte: filter.to };
    }
    if (filter.from) {
      where.endAt = { gte: filter.from };
    }

    return this.prisma.calendarEvent.findMany({
      where,
      orderBy: { startAt: 'asc' },
    });
  }

  findById(id: string): Promise<CalendarEvent | null> {
    return this.prisma.calendarEvent.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateEventData): Promise<CalendarEvent | null> {
    return this.prisma.calendarEvent
      .update({
        where: { id },
        data,
      })
      .catch((error) => {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.calendarEvent.delete({ where: { id } });
      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }
}
