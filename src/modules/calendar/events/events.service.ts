import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ProjectsRepository } from '@modules/projects/projects.repository';
import {
  DEFAULT_REMINDER_MINUTES,
  EventRemindersService,
} from '@modules/notifications';
import { EventsRepository } from './events.repository';
import { EventsMapper } from './events.mapper';
import { EventEntity } from './entities';
import { CreateEventDto, ListEventsQueryDto, UpdateEventDto } from './dto';
import { UpdateEventData } from './types';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly eventsMapper: EventsMapper,
    private readonly projectsRepository: ProjectsRepository,
    private readonly eventRemindersService: EventRemindersService,
    @InjectPinoLogger(EventsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(
    workspaceId: string,
    dto: CreateEventDto,
    userId: string,
  ): Promise<EventEntity> {
    const projectId = dto.projectId ?? null;
    await this.assertProjectInWorkspace(workspaceId, projectId);

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertValidRange(startAt, endAt);

    const telegramReminder = dto.telegramReminder ?? false;
    const reminderMinutes =
      dto.reminderMinutes ??
      (telegramReminder ? DEFAULT_REMINDER_MINUTES : null);

    const event = await this.eventsRepository.create(workspaceId, {
      title: dto.title,
      startAt,
      endAt,
      allDay: dto.allDay ?? false,
      projectId,
      reminderMinutes,
      telegramReminder,
      reminderUserId: telegramReminder ? userId : null,
    });

    await this.eventRemindersService.scheduleForEvent(event);

    this.logger.info(
      { eventId: event.id, workspaceId, action: 'event_create' },
      'event created',
    );

    return this.eventsMapper.toEntity(event);
  }

  async findAllByWorkspaceId(
    workspaceId: string,
    query: ListEventsQueryDto,
  ): Promise<EventEntity[]> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException('"from" must be before or equal to "to"');
    }

    const events = await this.eventsRepository.findAllByWorkspaceId(
      workspaceId,
      {
        from,
        to,
        projectId: query.projectId,
      },
    );

    return this.eventsMapper.toEntities(events);
  }

  async findById(id: string): Promise<EventEntity | null> {
    const event = await this.eventsRepository.findById(id);
    return event ? this.eventsMapper.toEntity(event) : null;
  }

  async update(
    id: string,
    dto: UpdateEventDto,
    existingEvent?: EventEntity,
    userId?: string,
  ): Promise<EventEntity> {
    const event = existingEvent ?? (await this.eventsRepository.findById(id));
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const payload: UpdateEventData = {};

    if (dto.title !== undefined) {
      payload.title = dto.title;
    }
    if (dto.allDay !== undefined) {
      payload.allDay = dto.allDay;
    }

    if (dto.projectId !== undefined) {
      const newProjectId = dto.projectId ?? null;
      await this.assertProjectInWorkspace(event.workspaceId, newProjectId);
      payload.projectId = newProjectId;
    }

    const startAt =
      dto.startAt !== undefined ? new Date(dto.startAt) : event.startAt;
    const endAt = dto.endAt !== undefined ? new Date(dto.endAt) : event.endAt;

    if (dto.startAt !== undefined || dto.endAt !== undefined) {
      this.assertValidRange(startAt, endAt);
      payload.startAt = startAt;
      payload.endAt = endAt;
    }

    this.applyReminderUpdate(payload, dto, event, userId);

    const updated = await this.eventsRepository.update(id, payload);
    if (!updated) {
      throw new NotFoundException('Event not found');
    }

    await this.eventRemindersService.scheduleForEvent(updated);

    this.logger.info(
      { eventId: id, workspaceId: event.workspaceId, action: 'event_update' },
      'event updated',
    );

    return this.eventsMapper.toEntity(updated);
  }

  private applyReminderUpdate(
    payload: UpdateEventData,
    dto: UpdateEventDto,
    event: EventEntity,
    userId?: string,
  ): void {
    if (dto.telegramReminder !== undefined) {
      payload.telegramReminder = dto.telegramReminder;
    }
    if (dto.reminderMinutes !== undefined) {
      payload.reminderMinutes = dto.reminderMinutes;
    }

    if (dto.telegramReminder === false) {
      payload.reminderUserId = null;
      return;
    }

    if (dto.telegramReminder === true && userId) {
      payload.reminderUserId = userId;
      if (dto.reminderMinutes === undefined && event.reminderMinutes == null) {
        payload.reminderMinutes = DEFAULT_REMINDER_MINUTES;
      }
    }
  }

  async setCompleted(
    id: string,
    isCompleted: boolean,
    existingEvent?: EventEntity,
  ): Promise<EventEntity> {
    const event = existingEvent ?? (await this.eventsRepository.findById(id));
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const updated = await this.eventsRepository.update(id, { isCompleted });
    if (!updated) {
      throw new NotFoundException('Event not found');
    }

    if (isCompleted) {
      await this.eventRemindersService.removeForEvent(id);
    } else {
      await this.eventRemindersService.scheduleForEvent(updated);
    }

    this.logger.info(
      {
        eventId: id,
        workspaceId: event.workspaceId,
        isCompleted,
        action: 'event_update_completion',
      },
      'event completion updated',
    );

    return this.eventsMapper.toEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.eventsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Event not found');
    }

    await this.eventRemindersService.removeForEvent(id);

    this.logger.info({ eventId: id, action: 'event_delete' }, 'event deleted');
  }

  private assertValidRange(startAt: Date, endAt: Date): void {
    if (endAt.getTime() < startAt.getTime()) {
      throw new BadRequestException('endAt must be after or equal to startAt');
    }
  }

  private async assertProjectInWorkspace(
    workspaceId: string,
    projectId: string | null,
  ): Promise<void> {
    if (!projectId) {
      return;
    }

    const project = await this.projectsRepository.findById(projectId);
    if (!project || project.workspaceId !== workspaceId) {
      throw new BadRequestException(
        'Project not found or not in the same workspace',
      );
    }
  }
}
