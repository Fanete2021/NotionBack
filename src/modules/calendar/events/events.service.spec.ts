jest.mock('@nestjs/bullmq', () => {
  const common =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@nestjs/common') as typeof import('@nestjs/common');

  return {
    BullModule: {
      registerQueue: jest.fn(() => ({})),
      forRoot: jest.fn(() => ({})),
    },
    InjectQueue: (name: string): ParameterDecorator =>
      common.Inject(`BullQueue_${name}`),
    Processor: jest.fn(() => jest.fn()),
    WorkerHost: class {},
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { provideMockPinoLogger } from '@common/testing';
import { ProjectsRepository } from '@modules/projects/projects.repository';
import { EventRemindersService } from '@modules/notifications/event-reminders.service';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { EventsMapper } from './events.mapper';
import { EventEntity } from './entities';

describe('EventsService', () => {
  let service: EventsService;

  const mockEventsRepository = {
    create: jest.fn(),
    findAllByWorkspaceId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockProjectsRepository = {
    findById: jest.fn(),
  };

  const mockEventRemindersService = {
    scheduleForEvent: jest.fn(),
    removeForEvent: jest.fn(),
  };

  const buildEvent = (overrides: Partial<EventEntity> = {}): EventEntity =>
    new EventEntity({
      id: 'e1',
      workspaceId: 'ws-1',
      projectId: null,
      title: 'Meeting',
      startAt: new Date('2026-09-09T14:00:00.000Z'),
      endAt: new Date('2026-09-09T14:30:00.000Z'),
      allDay: false,
      isCompleted: false,
      reminderMinutes: null,
      telegramReminder: false,
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
      ...overrides,
    });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        EventsMapper,
        { provide: EventsRepository, useValue: mockEventsRepository },
        { provide: ProjectsRepository, useValue: mockProjectsRepository },
        {
          provide: EventRemindersService,
          useValue: mockEventRemindersService,
        },
        provideMockPinoLogger(EventsService.name),
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  describe('create', () => {
    it('создаёт событие без проекта и конвертирует даты', async () => {
      const event = buildEvent();
      mockEventsRepository.create.mockResolvedValue(event);

      const result = await service.create(
        'ws-1',
        {
          title: 'Meeting',
          startAt: '2026-09-09T14:00:00.000Z',
          endAt: '2026-09-09T14:30:00.000Z',
        },
        'u1',
      );

      expect(mockProjectsRepository.findById).not.toHaveBeenCalled();
      expect(mockEventsRepository.create).toHaveBeenCalledWith('ws-1', {
        title: 'Meeting',
        startAt: new Date('2026-09-09T14:00:00.000Z'),
        endAt: new Date('2026-09-09T14:30:00.000Z'),
        allDay: false,
        projectId: null,
        reminderMinutes: null,
        telegramReminder: false,
        reminderUserId: null,
      });
      expect(mockEventRemindersService.scheduleForEvent).toHaveBeenCalledWith(
        event,
      );
      expect(result).toEqual(event);
    });

    it('включает telegram-напоминание и планирует его на создателя', async () => {
      const event = buildEvent({ telegramReminder: true, reminderMinutes: 30 });
      mockEventsRepository.create.mockResolvedValue(event);

      await service.create(
        'ws-1',
        {
          title: 'Meeting',
          startAt: '2026-09-09T14:00:00.000Z',
          endAt: '2026-09-09T14:30:00.000Z',
          telegramReminder: true,
          reminderMinutes: 30,
        },
        'u1',
      );

      expect(mockEventsRepository.create).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({
          reminderMinutes: 30,
          telegramReminder: true,
          reminderUserId: 'u1',
        }),
      );
      expect(mockEventRemindersService.scheduleForEvent).toHaveBeenCalledWith(
        event,
      );
    });

    it('проверяет, что проект принадлежит воркспейсу', async () => {
      mockProjectsRepository.findById.mockResolvedValue({
        id: 'p1',
        workspaceId: 'ws-1',
      });
      mockEventsRepository.create.mockResolvedValue(buildEvent());

      await service.create(
        'ws-1',
        {
          title: 'Meeting',
          startAt: '2026-09-09T14:00:00.000Z',
          endAt: '2026-09-09T14:30:00.000Z',
          projectId: 'p1',
        },
        'u1',
      );

      expect(mockProjectsRepository.findById).toHaveBeenCalledWith('p1');
    });

    it('бросает 400, если проект из другого воркспейса', async () => {
      mockProjectsRepository.findById.mockResolvedValue({
        id: 'p1',
        workspaceId: 'ws-other',
      });

      await expect(
        service.create(
          'ws-1',
          {
            title: 'Meeting',
            startAt: '2026-09-09T14:00:00.000Z',
            endAt: '2026-09-09T14:30:00.000Z',
            projectId: 'p1',
          },
          'u1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockEventsRepository.create).not.toHaveBeenCalled();
    });

    it('бросает 400, если endAt раньше startAt', async () => {
      await expect(
        service.create(
          'ws-1',
          {
            title: 'Meeting',
            startAt: '2026-09-09T15:00:00.000Z',
            endAt: '2026-09-09T14:00:00.000Z',
          },
          'u1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockEventsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllByWorkspaceId', () => {
    it('передаёт диапазон и фильтр по проекту в репозиторий', async () => {
      mockEventsRepository.findAllByWorkspaceId.mockResolvedValue([]);

      await service.findAllByWorkspaceId('ws-1', {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T00:00:00.000Z',
        projectId: 'p1',
      });

      expect(mockEventsRepository.findAllByWorkspaceId).toHaveBeenCalledWith(
        'ws-1',
        {
          from: new Date('2026-09-01T00:00:00.000Z'),
          to: new Date('2026-09-30T00:00:00.000Z'),
          projectId: 'p1',
        },
      );
    });

    it('бросает 400, если from позже to', async () => {
      await expect(
        service.findAllByWorkspaceId('ws-1', {
          from: '2026-09-30T00:00:00.000Z',
          to: '2026-09-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('не переназначает получателя, если Telegram уже включён', async () => {
      const event = buildEvent({
        telegramReminder: true,
        reminderMinutes: 15,
      });
      mockEventsRepository.update.mockResolvedValue(event);

      await service.update('e1', { title: 'New' }, event, 'u2');

      expect(mockEventsRepository.update).toHaveBeenCalledWith('e1', {
        title: 'New',
      });
    });

    it('фиксирует получателя только при явном включении Telegram', async () => {
      const event = buildEvent();
      mockEventsRepository.update.mockResolvedValue(
        buildEvent({ telegramReminder: true, reminderMinutes: 15 }),
      );

      await service.update('e1', { telegramReminder: true }, event, 'u2');

      expect(mockEventsRepository.update).toHaveBeenCalledWith('e1', {
        telegramReminder: true,
        reminderUserId: 'u2',
        reminderMinutes: 15,
      });
    });

    it('обновляет только переданные поля', async () => {
      const event = buildEvent();
      const updated = buildEvent({ title: 'New' });
      mockEventsRepository.update.mockResolvedValue(updated);

      const result = await service.update('e1', { title: 'New' }, event);

      expect(mockEventsRepository.update).toHaveBeenCalledWith('e1', {
        title: 'New',
      });
      expect(result).toEqual(updated);
    });

    it('валидирует диапазон с учётом существующего значения', async () => {
      const event = buildEvent();

      await expect(
        service.update('e1', { endAt: '2026-09-09T13:00:00.000Z' }, event),
      ).rejects.toThrow(BadRequestException);
      expect(mockEventsRepository.update).not.toHaveBeenCalled();
    });

    it('бросает 404, если события нет', async () => {
      mockEventsRepository.findById.mockResolvedValue(null);

      await expect(service.update('missing', { title: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setCompleted', () => {
    it('отмечает событие выполненным', async () => {
      const event = buildEvent();
      const updated = buildEvent({ isCompleted: true });
      mockEventsRepository.update.mockResolvedValue(updated);

      const result = await service.setCompleted('e1', true, event);

      expect(mockEventsRepository.update).toHaveBeenCalledWith('e1', {
        isCompleted: true,
      });
      expect(result).toEqual(updated);
    });

    it('снимает отметку выполнения', async () => {
      const event = buildEvent({ isCompleted: true });
      const updated = buildEvent({ isCompleted: false });
      mockEventsRepository.update.mockResolvedValue(updated);

      const result = await service.setCompleted('e1', false, event);

      expect(mockEventsRepository.update).toHaveBeenCalledWith('e1', {
        isCompleted: false,
      });
      expect(result.isCompleted).toBe(false);
    });

    it('бросает 404, если события нет', async () => {
      mockEventsRepository.findById.mockResolvedValue(null);

      await expect(service.setCompleted('missing', true)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockEventsRepository.update).not.toHaveBeenCalled();
    });

    it('бросает 404, если событие удалили между гардом и записью', async () => {
      const event = buildEvent();
      mockEventsRepository.update.mockResolvedValue(null);

      await expect(service.setCompleted('e1', true, event)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('бросает 404, если события нет', async () => {
      mockEventsRepository.delete.mockResolvedValue(false);

      await expect(service.delete('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('удаляет существующее событие', async () => {
      mockEventsRepository.delete.mockResolvedValue(true);

      await expect(service.delete('e1')).resolves.toBeUndefined();
    });
  });
});
