import { provideMockPinoLogger } from '@common/testing';
import { ProjectsRepository } from '@modules/projects/projects.repository';
import { S3ObjectService } from '@modules/s3';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PageSearchType } from './dto';
import { PageEntity } from './entities';
import { PagesMapper } from './pages.mapper';
import { PagesRepository } from './pages.repository';
import { PagesService } from './pages.service';

describe('PagesService', () => {
  let service: PagesService;

  const mockPagesRepository = {
    create: jest.fn(),
    findAllByWorkspaceId: jest.fn(),
    findById: jest.fn(),
    findByIdIncludingDeleted: jest.fn(),
    findTrashedByWorkspaceId: jest.fn(),
    findTrashedForPurge: jest.fn(),
    findExpiredTrashed: jest.fn(),
    findAttachmentKeys: jest.fn(),
    nextPosition: jest.fn(),
    reorder: jest.fn(),
    search: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    hardDelete: jest.fn(),
  };

  const mockProjectsRepository = {
    findById: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockS3ObjectService = {
    deleteObject: jest.fn(),
  };

  const pageFixture = (overrides: Partial<PageEntity> = {}): PageEntity =>
    new PageEntity(
      overrides.id ?? 'p1',
      overrides.workspaceId ?? 'ws-1',
      overrides.projectId ?? 'prj-1',
      overrides.parentPageId ?? null,
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
        PagesMapper,
        { provide: PagesRepository, useValue: mockPagesRepository },
        { provide: ProjectsRepository, useValue: mockProjectsRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: S3ObjectService, useValue: mockS3ObjectService },
        provideMockPinoLogger(PagesService.name),
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

  describe('reorder', () => {
    it('переупорядочивает документы проекта', async () => {
      mockProjectsRepository.findById.mockResolvedValue({
        id: 'prj-1',
        workspaceId: 'ws-1',
      });
      const reordered = [pageFixture({ id: 'a' }), pageFixture({ id: 'b' })];
      mockPagesRepository.reorder.mockResolvedValue(reordered);

      const result = await service.reorder('ws-1', 'prj-1', ['a', 'b']);

      expect(mockPagesRepository.reorder).toHaveBeenCalledWith(
        'ws-1',
        'prj-1',
        ['a', 'b'],
      );
      expect(result).toBe(reordered);
    });

    it('бросает 400, если orderedIds не совпадают с документами проекта', async () => {
      mockProjectsRepository.findById.mockResolvedValue({
        id: 'prj-1',
        workspaceId: 'ws-1',
      });
      mockPagesRepository.reorder.mockResolvedValue(null);

      await expect(service.reorder('ws-1', 'prj-1', ['a'])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('бросает 404, если проект не найден', async () => {
      mockProjectsRepository.findById.mockResolvedValue(null);

      await expect(service.reorder('ws-1', 'missing', ['a'])).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPagesRepository.reorder).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    const path = [
      { type: 'project' as const, id: 'prj-1', name: 'Документы' },
      { type: 'page' as const, id: 'p1', name: 'Отчёт' },
    ];
    const row = {
      id: 'p1',
      workspaceId: 'ws-1',
      projectId: 'prj-1',
      parentPageId: null,
      title: 'Отчёт',
      icon: null,
      type: 'DOC',
      updatedAt: new Date(),
      titleMatch: false,
      pos: 6,
      snippet: '...отчёт...',
      path,
    };

    it('применяет значения по умолчанию и маппит совпадение в контенте', async () => {
      mockPagesRepository.search.mockResolvedValue([row]);

      const result = await service.search('ws-1', { q: 'отчёт' });

      expect(mockPagesRepository.search).toHaveBeenCalledWith('ws-1', {
        q: 'отчёт',
        type: 'all',
        projectId: undefined,
        from: undefined,
        to: undefined,
        limit: 20,
      });
      expect(result[0]).toMatchObject({
        pageId: 'p1',
        matchedIn: 'content',
        snippet: '...отчёт...',
        matchOffset: 5,
        path,
      });
    });

    it('помечает совпадение в заголовке', async () => {
      mockPagesRepository.search.mockResolvedValue([
        { ...row, titleMatch: true, pos: 0, snippet: null },
      ]);

      const [result] = await service.search('ws-1', { q: 'отчёт' });

      expect(result.matchedIn).toBe('title');
      expect(result.snippet).toBeNull();
      expect(result.matchOffset).toBeNull();
    });

    it('для type=content не помечает совпадение как title', async () => {
      mockPagesRepository.search.mockResolvedValue([
        { ...row, titleMatch: true },
      ]);

      const [result] = await service.search('ws-1', {
        q: 'отчёт',
        type: PageSearchType.CONTENT,
      });

      expect(result.matchedIn).toBe('content');
      expect(result.snippet).toBe('...отчёт...');
    });

    it('для type=documents и совпадения в заголовке не отдаёт сниппет', async () => {
      mockPagesRepository.search.mockResolvedValue([
        { ...row, titleMatch: true },
      ]);

      const [result] = await service.search('ws-1', {
        q: 'отчёт',
        type: PageSearchType.DOCUMENTS,
      });

      expect(result.matchedIn).toBe('title');
      expect(result.snippet).toBeNull();
      expect(result.matchOffset).toBeNull();
    });

    it('бросает 400, если from позже to', async () => {
      await expect(
        service.search('ws-1', {
          q: 'отчёт',
          from: new Date('2026-02-01T00:00:00.000Z'),
          to: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPagesRepository.search).not.toHaveBeenCalled();
    });

    it('бросает 404, если проект не найден', async () => {
      mockProjectsRepository.findById.mockResolvedValue(null);

      await expect(
        service.search('ws-1', { q: 'abc', projectId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPagesRepository.search).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('мягко удаляет страницу и фиксирует автора удаления', async () => {
      mockPagesRepository.softDelete.mockResolvedValue(true);

      await expect(
        service.delete(pageFixture(), 'user-2'),
      ).resolves.toBeUndefined();
      expect(mockPagesRepository.softDelete).toHaveBeenCalledWith(
        'p1',
        'user-2',
      );
    });

    it('бросает 404, если страница не была удалена', async () => {
      mockPagesRepository.softDelete.mockResolvedValue(null);

      await expect(service.delete(pageFixture(), 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findTrash', () => {
    it('маппит удалённые страницы в TrashedPageEntity', async () => {
      const now = new Date();
      mockPagesRepository.findTrashedByWorkspaceId.mockResolvedValue([
        {
          id: 'p1',
          workspaceId: 'ws-1',
          projectId: 'prj-1',
          parentPageId: null,
          title: 'Отчёт Q4',
          icon: null,
          type: 'DOC',
          authorId: 'user-1',
          position: 0,
          createdAt: now,
          updatedAt: now,
          deletedAt: now,
          deletedBy: 'user-2',
          author: {
            id: 'user-1',
            name: 'Автор',
            email: 'author@example.com',
            avatarUrl: null,
          },
          deletedByUser: {
            id: 'user-2',
            name: 'Удаливший',
            email: 'deleter@example.com',
            avatarUrl: null,
          },
        },
      ]);

      const result = await service.findTrash('ws-1');

      expect(mockPagesRepository.findTrashedByWorkspaceId).toHaveBeenCalledWith(
        'ws-1',
        undefined,
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'p1',
        deletedAt: now,
        author: { id: 'user-1' },
        deletedBy: { id: 'user-2' },
      });
    });

    it('возвращает deletedBy = null, если аккаунт удалён', async () => {
      const now = new Date();
      mockPagesRepository.findTrashedByWorkspaceId.mockResolvedValue([
        {
          id: 'p1',
          workspaceId: 'ws-1',
          projectId: 'prj-1',
          parentPageId: null,
          title: 'Отчёт Q4',
          icon: null,
          type: 'DOC',
          authorId: 'user-1',
          position: 0,
          createdAt: now,
          updatedAt: now,
          deletedAt: now,
          deletedBy: null,
          author: {
            id: 'user-1',
            name: 'Автор',
            email: 'author@example.com',
            avatarUrl: null,
          },
          deletedByUser: null,
        },
      ]);

      const result = await service.findTrash('ws-1');

      expect(result[0].deletedBy).toBeNull();
    });

    it('пробрасывает строку поиска в репозиторий', async () => {
      mockPagesRepository.findTrashedByWorkspaceId.mockResolvedValue([]);

      await service.findTrash('ws-1', 'отчёт');

      expect(mockPagesRepository.findTrashedByWorkspaceId).toHaveBeenCalledWith(
        'ws-1',
        'отчёт',
      );
    });
  });

  describe('emptyTrash', () => {
    it('жёстко удаляет все документы корзины и возвращает количество', async () => {
      mockPagesRepository.findTrashedForPurge.mockResolvedValue([
        { id: 'p1', workspaceId: 'ws-1' },
        { id: 'p2', workspaceId: 'ws-1' },
      ]);
      mockPagesRepository.findAttachmentKeys.mockResolvedValue([]);
      mockPagesRepository.hardDelete.mockResolvedValue(true);

      const deleted = await service.emptyTrash('ws-1');

      expect(mockPagesRepository.findTrashedForPurge).toHaveBeenCalledWith(
        'ws-1',
      );
      expect(deleted).toBe(2);
      expect(mockPagesRepository.hardDelete).toHaveBeenCalledTimes(2);
    });

    it('возвращает 0 для пустой корзины', async () => {
      mockPagesRepository.findTrashedForPurge.mockResolvedValue([]);

      const deleted = await service.emptyTrash('ws-1');

      expect(deleted).toBe(0);
      expect(mockPagesRepository.hardDelete).not.toHaveBeenCalled();
    });
  });

  describe('findDeletableById', () => {
    it('возвращает удалённую страницу', async () => {
      mockPagesRepository.findByIdIncludingDeleted.mockResolvedValue({
        id: 'p1',
        workspaceId: 'ws-1',
        projectId: 'prj-1',
        parentPageId: null,
        title: 'X',
        icon: null,
        type: 'DOC',
        authorId: 'user-1',
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.findDeletableById('p1')).resolves.toMatchObject({
        id: 'p1',
      });
    });

    it('бросает 404, если страница не существует', async () => {
      mockPagesRepository.findByIdIncludingDeleted.mockResolvedValue(null);

      await expect(service.findDeletableById('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restore', () => {
    it('восстанавливает страницу из корзины', async () => {
      mockPagesRepository.restore.mockResolvedValue({ id: 'p1' });

      await expect(service.restore(pageFixture())).resolves.toEqual({
        id: 'p1',
      });
      expect(mockPagesRepository.restore).toHaveBeenCalledWith('p1');
    });

    it('бросает 404, если страницы нет в корзине', async () => {
      mockPagesRepository.restore.mockResolvedValue(null);

      await expect(service.restore(pageFixture())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hardDelete', () => {
    it('удаляет вложения из хранилища и страницу из БД', async () => {
      mockPagesRepository.findAttachmentKeys.mockResolvedValue([
        'ws/p1/a.png',
        'ws/p1/b.png',
      ]);
      mockS3ObjectService.deleteObject.mockResolvedValue(undefined);
      mockPagesRepository.hardDelete.mockResolvedValue(true);

      await expect(service.hardDelete(pageFixture())).resolves.toBeUndefined();

      expect(mockS3ObjectService.deleteObject).toHaveBeenCalledTimes(2);
      expect(mockS3ObjectService.deleteObject).toHaveBeenCalledWith(
        'ws/p1/a.png',
      );
      expect(mockPagesRepository.hardDelete).toHaveBeenCalledWith('p1');
    });

    it('не удаляет страницу из БД, если чистка хранилища упала', async () => {
      mockPagesRepository.findAttachmentKeys.mockResolvedValue(['ws/p1/a.png']);
      mockS3ObjectService.deleteObject.mockRejectedValue(new Error('s3 down'));

      await expect(service.hardDelete(pageFixture())).rejects.toThrow(
        's3 down',
      );
      expect(mockPagesRepository.hardDelete).not.toHaveBeenCalled();
    });

    it('бросает 404, если страница не найдена', async () => {
      mockPagesRepository.findAttachmentKeys.mockResolvedValue([]);
      mockPagesRepository.hardDelete.mockResolvedValue(false);

      await expect(service.hardDelete(pageFixture())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hardDeleteExpired', () => {
    it('жёстко удаляет просроченные страницы и возвращает их количество', async () => {
      mockPagesRepository.findExpiredTrashed.mockResolvedValue([
        { id: 'p1', workspaceId: 'ws-1' },
        { id: 'p2', workspaceId: 'ws-1' },
      ]);
      mockPagesRepository.findAttachmentKeys.mockResolvedValue([]);
      mockPagesRepository.hardDelete.mockResolvedValue(true);

      const purged = await service.hardDeleteExpired(30);

      expect(purged).toBe(2);
      expect(mockPagesRepository.hardDelete).toHaveBeenCalledTimes(2);
      expect(mockPagesRepository.findExpiredTrashed).toHaveBeenCalledWith(
        expect.any(Date),
      );
      const [threshold] = mockPagesRepository.findExpiredTrashed.mock
        .calls[0] as [Date];
      expect(threshold.getTime()).toBeLessThan(Date.now());
    });

    it('продолжает обработку, если одна страница упала', async () => {
      mockPagesRepository.findExpiredTrashed.mockResolvedValue([
        { id: 'p1', workspaceId: 'ws-1' },
        { id: 'p2', workspaceId: 'ws-1' },
      ]);
      mockPagesRepository.findAttachmentKeys
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce([]);
      mockPagesRepository.hardDelete.mockResolvedValue(true);

      const purged = await service.hardDeleteExpired(30);

      expect(purged).toBe(1);
      expect(mockPagesRepository.hardDelete).toHaveBeenCalledTimes(1);
    });
  });
});
