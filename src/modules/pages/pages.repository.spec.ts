import { Test, TestingModule } from '@nestjs/testing';
import { PagesRepository } from './pages.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { PageType, Prisma } from '@prisma/client';
import { PageEntity } from './entities/page.entity';
import { PageContentEntity } from './entities/page-content.entity';

describe('PagesRepository', () => {
  let repository: PagesRepository;

  const mockTx = {
    page: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    pageContent: {
      create: jest.fn(),
    },
  };

  const mockPrisma = {
    page: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pageContent: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const pageFixture = (
    id: string,
    position: number,
  ): Record<string, unknown> => ({
    id,
    workspaceId: 'ws-1',
    projectId: 'prj-1',
    title: `Page ${id}`,
    icon: null,
    type: PageType.DOC,
    authorId: 'user-1',
    position,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const contentFixture = (
    pageId: string,
    json: unknown = { type: 'doc', content: [] },
  ): Record<string, unknown> => ({
    pageId,
    json,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const p2025 = (): Prisma.PrismaClientKnownRequestError =>
    new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PagesRepository>(PagesRepository);

    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) => callback(mockTx),
    );
  });

  describe('create', () => {
    it('создаёт страницу с контентом в транзакции, позиция = max + 1', async () => {
      mockTx.page.aggregate.mockResolvedValue({ _max: { position: 2 } });
      mockTx.page.create.mockResolvedValue(pageFixture('p3', 3));
      mockTx.pageContent.create.mockResolvedValue(contentFixture('p3'));

      const result = await repository.create('ws-1', 'user-1', {
        projectId: 'prj-1',
        title: 'P3',
        icon: null,
        type: PageType.DOC,
      });

      expect(mockTx.page.aggregate).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1', projectId: 'prj-1', parentPageId: null },
        _max: { position: true },
      });
      expect(mockTx.page.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'ws-1',
          authorId: 'user-1',
          projectId: 'prj-1',
          title: 'P3',
          icon: null,
          type: PageType.DOC,
          position: 3,
        },
      });
      expect(mockTx.pageContent.create).toHaveBeenCalledWith({
        data: {
          pageId: 'p3',
          json: { type: 'doc', content: [] },
        },
      });
      expect(result).toBeInstanceOf(PageEntity);
    });

    it('вычисляет позицию 0, если страниц в проекте ещё нет', async () => {
      mockTx.page.aggregate.mockResolvedValue({ _max: { position: null } });
      mockTx.page.create.mockResolvedValue(pageFixture('p1', 0));
      mockTx.pageContent.create.mockResolvedValue(contentFixture('p1'));

      const result = await repository.create('ws-1', 'user-1', {
        projectId: 'prj-1',
        title: 'P1',
        icon: null,
        type: PageType.DOC,
      });

      expect(mockTx.page.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'ws-1',
          authorId: 'user-1',
          projectId: 'prj-1',
          title: 'P1',
          icon: null,
          type: PageType.DOC,
          position: 0,
        },
      });
      expect(result).toBeInstanceOf(PageEntity);
    });
  });

  describe('findAllByWorkspaceId', () => {
    it('возвращает страницы по воркспейсу без удалённых', async () => {
      mockPrisma.page.findMany.mockResolvedValue([
        pageFixture('p1', 0),
        pageFixture('p2', 1),
      ]);

      const result = await repository.findAllByWorkspaceId('ws-1');

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1', deletedAt: null },
        orderBy: { position: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(PageEntity);
    });

    it('фильтрует по projectId, если передан', async () => {
      mockPrisma.page.findMany.mockResolvedValue([pageFixture('p1', 0)]);

      await repository.findAllByWorkspaceId('ws-1', 'prj-1');

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: 'ws-1',
          deletedAt: null,
          projectId: 'prj-1',
        },
        orderBy: { position: 'asc' },
      });
    });
  });

  describe('nextPosition', () => {
    it('возвращает следующую позицию как _max + 1 для корневых страниц', async () => {
      mockPrisma.page.aggregate.mockResolvedValue({ _max: { position: 2 } });

      const result = await repository.nextPosition('ws-1', 'prj-1');

      expect(mockPrisma.page.aggregate).toHaveBeenCalledWith({
        where: {
          workspaceId: 'ws-1',
          projectId: 'prj-1',
          parentPageId: null,
        },
        _max: { position: true },
      });
      expect(result).toBe(3);
    });

    it('возвращает 0, если страниц в проекте ещё нет', async () => {
      mockPrisma.page.aggregate.mockResolvedValue({
        _max: { position: null },
      });

      const result = await repository.nextPosition('ws-1', 'prj-1');

      expect(result).toBe(0);
    });
  });

  describe('findById', () => {
    it('возвращает null, если страница не найдена', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(repository.findById('ghost')).resolves.toBeNull();
      expect(mockPrisma.page.findUnique).toHaveBeenCalledWith({
        where: { id: 'ghost', deletedAt: null },
      });
    });

    it('возвращает сущность страницы', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(pageFixture('p1', 0));

      const result = await repository.findById('p1');

      expect(result).toBeInstanceOf(PageEntity);
      expect(result?.id).toBe('p1');
    });
  });

  describe('update', () => {
    it('возвращает null, если страница не найдена (P2025)', async () => {
      mockPrisma.page.update.mockRejectedValue(p2025());

      await expect(
        repository.update('ghost', { title: 'X' }),
      ).resolves.toBeNull();
    });

    it('обновляет и возвращает сущность', async () => {
      mockPrisma.page.update.mockResolvedValue(pageFixture('p1', 0));

      const result = await repository.update('p1', { title: 'New' });

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'p1', deletedAt: null },
        data: { title: 'New' },
      });
      expect(result).toBeInstanceOf(PageEntity);
    });
  });

  describe('softDelete', () => {
    it('возвращает false, если страница не найдена (P2025)', async () => {
      mockPrisma.page.update.mockRejectedValue(p2025());

      await expect(repository.softDelete('ghost')).resolves.toBe(false);
    });

    it('проставляет deletedAt и возвращает true', async () => {
      mockPrisma.page.update.mockResolvedValue(pageFixture('p1', 0));

      const result = await repository.softDelete('p1');

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'p1', deletedAt: null },
        data: { deletedAt: expect.any(Date) as Date },
      });
      expect(result).toBe(true);
    });
  });

  describe('content', () => {
    it('возвращает null, если контента нет', async () => {
      mockPrisma.pageContent.findUnique.mockResolvedValue(null);

      await expect(repository.findContent('p1')).resolves.toBeNull();
    });

    it('возвращает сущность контента', async () => {
      mockPrisma.pageContent.findUnique.mockResolvedValue(contentFixture('p1'));

      const result = await repository.findContent('p1');

      expect(result).toBeInstanceOf(PageContentEntity);
      expect(result?.json).toEqual({ type: 'doc', content: [] });
    });

    it('upsert создаёт или перезаписывает контент', async () => {
      mockPrisma.pageContent.upsert.mockResolvedValue(
        contentFixture('p1', { type: 'doc', content: [{ type: 'text' }] }),
      );

      const result = await repository.upsertContent('p1', {
        type: 'doc',
        content: [{ type: 'text' }],
      });

      expect(mockPrisma.pageContent.upsert).toHaveBeenCalledWith({
        where: { pageId: 'p1' },
        create: {
          pageId: 'p1',
          json: { type: 'doc', content: [{ type: 'text' }] },
        },
        update: { json: { type: 'doc', content: [{ type: 'text' }] } },
      });
      expect(result).toBeInstanceOf(PageContentEntity);
    });
  });
});
