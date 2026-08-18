import { Test, TestingModule } from '@nestjs/testing';
import { PagesService } from './pages.service';
import { PagesRepository } from './pages.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { PageEntity } from './entities/page.entity';

describe('PagesService', () => {
  let service: PagesService;

  const mockPagesRepository = {
    create: jest.fn(),
    findAllByWorkspaceId: jest.fn(),
    findById: jest.fn(),
    nextPosition: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findContent: jest.fn(),
    upsertContent: jest.fn(),
  };

  const mockProjectsRepository = {
    findById: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const pageFixture = (overrides: Partial<PageEntity> = {}): PageEntity =>
    new PageEntity(
      overrides.id ?? 'p1',
      overrides.workspaceId ?? 'ws-1',
      overrides.projectId ?? 'prj-1',
      overrides.title ?? 'Введение',
      overrides.icon ?? null,
      overrides.type ?? 'DOC',
      overrides.authorId ?? 'user-1',
      overrides.position ?? 0,
      overrides.createdAt ?? new Date(),
      overrides.updatedAt ?? new Date(),
    );

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(1048576);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesService,
        { provide: PagesRepository, useValue: mockPagesRepository },
        { provide: ProjectsRepository, useValue: mockProjectsRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PagesService>(PagesService);
  });

  describe('create', () => {
    it('бросает 404, если проект не найден', async () => {
      mockProjectsRepository.findById.mockResolvedValue(null);

      await expect(
        service.create('ws-1', 'user-1', {
          title: 'Введение',
          workspaceId: 'ws-1',
          projectId: 'missing',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPagesRepository.create).not.toHaveBeenCalled();
    });

    it('бросает 400, если проект из другого воркспейса', async () => {
      mockProjectsRepository.findById.mockResolvedValue({
        id: 'prj-1',
        workspaceId: 'ws-other',
      });

      await expect(
        service.create('ws-1', 'user-1', {
          title: 'Введение',
          workspaceId: 'ws-1',
          projectId: 'prj-1',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPagesRepository.create).not.toHaveBeenCalled();
    });

    it('создаёт страницу с типом DOC и без иконки по умолчанию', async () => {
      mockProjectsRepository.findById.mockResolvedValue({
        id: 'prj-1',
        workspaceId: 'ws-1',
      });
      mockPagesRepository.create.mockResolvedValue({ id: 'p1' });

      const result = await service.create('ws-1', 'user-1', {
        title: 'Введение',
        workspaceId: 'ws-1',
        projectId: 'prj-1',
      });

      expect(mockPagesRepository.create).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
        {
          projectId: 'prj-1',
          title: 'Введение',
          icon: null,
          type: 'DOC',
        },
      );
      expect(result).toEqual({ id: 'p1' });
    });

    it('передаёт иконку при создании', async () => {
      mockProjectsRepository.findById.mockResolvedValue({
        id: 'prj-1',
        workspaceId: 'ws-1',
      });
      mockPagesRepository.create.mockResolvedValue({ id: 'p1' });

      const result = await service.create('ws-1', 'user-1', {
        title: 'Введение',
        icon: '📄',
        workspaceId: 'ws-1',
        projectId: 'prj-1',
      });

      expect(mockPagesRepository.create).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
        {
          projectId: 'prj-1',
          title: 'Введение',
          icon: '📄',
          type: 'DOC',
        },
      );
      expect(result).toEqual({ id: 'p1' });
    });
  });

  describe('findAllByWorkspaceId', () => {
    it('делегирует в репозиторий с фильтром по проекту', async () => {
      mockPagesRepository.findAllByWorkspaceId.mockResolvedValue([
        { id: 'p1' },
      ]);

      const result = await service.findAllByWorkspaceId('ws-1', 'prj-1');

      expect(mockPagesRepository.findAllByWorkspaceId).toHaveBeenCalledWith(
        'ws-1',
        'prj-1',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('бросает 404, если страница не существует', async () => {
      mockPagesRepository.findById.mockResolvedValue(null);

      await expect(service.findById('p1')).rejects.toThrow(NotFoundException);
    });

    it('возвращает страницу', async () => {
      mockPagesRepository.findById.mockResolvedValue({ id: 'p1' });

      await expect(service.findById('p1')).resolves.toEqual({ id: 'p1' });
    });
  });

  describe('update', () => {
    it('обновляет без перемещения, если projectId не передан', async () => {
      mockPagesRepository.update.mockResolvedValue({ id: 'p1' });

      await service.update(pageFixture(), { title: 'New' });

      expect(mockProjectsRepository.findById).not.toHaveBeenCalled();
      expect(mockPagesRepository.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ title: 'New' }),
      );
    });

    it('перемещает в конец нового проекта', async () => {
      mockProjectsRepository.findById.mockResolvedValue({
        id: 'prj-2',
        workspaceId: 'ws-1',
      });
      mockPagesRepository.nextPosition.mockResolvedValue(3);
      mockPagesRepository.update.mockResolvedValue({ id: 'p1' });

      await service.update(pageFixture(), { projectId: 'prj-2' });

      expect(mockPagesRepository.nextPosition).toHaveBeenCalledWith(
        'ws-1',
        'prj-2',
      );
      expect(mockPagesRepository.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ projectId: 'prj-2', position: 3 }),
      );
    });

    it('не перемещает, если projectId совпадает с текущим', async () => {
      mockPagesRepository.update.mockResolvedValue({ id: 'p1' });

      await service.update(pageFixture(), { projectId: 'prj-1' });

      expect(mockPagesRepository.nextPosition).not.toHaveBeenCalled();
      expect(mockPagesRepository.update).toHaveBeenCalledWith(
        'p1',
        expect.not.objectContaining({ projectId: 'prj-1' }),
      );
    });

    it('бросает 404, если целевой проект не найден при перемещении', async () => {
      mockProjectsRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(pageFixture(), { projectId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPagesRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('мягко удаляет страницу', async () => {
      mockPagesRepository.softDelete.mockResolvedValue(true);

      await expect(service.delete(pageFixture())).resolves.toBeUndefined();
      expect(mockPagesRepository.softDelete).toHaveBeenCalledWith('p1');
    });

    it('бросает 404, если страница не была удалена', async () => {
      mockPagesRepository.softDelete.mockResolvedValue(null);

      await expect(service.delete(pageFixture())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getContent', () => {
    it('возвращает пустой документ, если контента ещё нет', async () => {
      mockPagesRepository.findContent.mockResolvedValue(null);

      const result = await service.getContent(pageFixture());

      expect(result.pageId).toBe('p1');
      expect(result.json).toEqual({ type: 'doc', content: [] });
      expect(mockPagesRepository.findContent).toHaveBeenCalledWith('p1');
    });

    it('возвращает сохранённый контент', async () => {
      mockPagesRepository.findContent.mockResolvedValue({
        pageId: 'p1',
        json: { type: 'doc', content: [{ type: 'paragraph' }] },
      });

      const result = await service.getContent(pageFixture());

      expect(result.json).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      });
    });
  });

  describe('updateContent', () => {
    it('бросает 400, если тело не является JSON-значением', async () => {
      await expect(service.updateContent(pageFixture(), null)).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.updateContent(pageFixture(), undefined),
      ).rejects.toThrow(BadRequestException);
      expect(mockPagesRepository.upsertContent).not.toHaveBeenCalled();
    });

    it('бросает 400, если тело не является объектом', async () => {
      await expect(service.updateContent(pageFixture(), 'doc')).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.updateContent(pageFixture(), [1, 2, 3]),
      ).rejects.toThrow(BadRequestException);
      expect(mockPagesRepository.upsertContent).not.toHaveBeenCalled();
    });

    it('бросает 413, если размер превышает лимит', async () => {
      mockConfigService.get.mockReturnValue(10);

      await expect(
        service.updateContent(pageFixture(), {
          type: 'doc',
          content: [{ type: 'paragraph', text: 'Слишком длинный контент' }],
        }),
      ).rejects.toThrow(PayloadTooLargeException);
      expect(mockPagesRepository.upsertContent).not.toHaveBeenCalled();
    });

    it('перезаписывает контент целиком', async () => {
      mockPagesRepository.upsertContent.mockResolvedValue({
        pageId: 'p1',
        json: { type: 'doc' },
      });

      const json = { type: 'doc', content: [{ type: 'paragraph' }] };
      const result = await service.updateContent(pageFixture(), json);

      expect(mockPagesRepository.upsertContent).toHaveBeenCalledWith(
        'p1',
        json,
      );
      expect(result.json).toEqual({ type: 'doc' });
    });
  });
});
