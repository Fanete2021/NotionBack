import { Test, TestingModule } from '@nestjs/testing';
import { PageType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { PageSearchType } from './dto';
import { escapeLikePattern, PagesRepository } from './pages.repository';

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
      delete: jest.fn(),
    },
    pageContent: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
    },
    attachment: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const pageFixture = (
    id: string,
    position: number,
  ): Record<string, unknown> => ({
    id,
    workspaceId: 'ws-1',
    projectId: 'prj-1',
    parentPageId: null,
    title: `Page ${id}`,
    icon: null,
    type: PageType.DOC,
    authorId: 'user-1',
    position,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
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

  describe('escapeLikePattern', () => {
    it('экранирует спецсимволы LIKE', () => {
      expect(escapeLikePattern('50%_a\\b')).toBe('50\\%\\_a\\\\b');
    });
  });

  describe('search', () => {
    const flattenSql = (strings: TemplateStringsArray, values: unknown[]) => {
      let sql = '';
      for (let index = 0; index < strings.length; index += 1) {
        sql += strings[index];
        if (index >= values.length) {
          continue;
        }
        const value = values[index];
        if (
          value &&
          typeof value === 'object' &&
          'strings' in value &&
          'values' in value
        ) {
          const nested = value as {
            strings: TemplateStringsArray;
            values: unknown[];
          };
          sql += flattenSql(nested.strings, nested.values);
        }
      }
      return sql;
    };

    const getSqlParts = (callIndex = 0) => {
      const [strings, ...values] = mockPrisma.$queryRaw.mock.calls[
        callIndex
      ] as unknown as [TemplateStringsArray, ...unknown[]];
      return { sql: flattenSql(strings, values), values };
    };

    it('выполняет параметризованный запрос с экранированным шаблоном и лимитом', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      await repository.search('ws-1', {
        q: '50%',
        type: PageSearchType.ALL,
        projectId: 'prj-1',
        limit: 10,
      });

      const { sql, values } = getSqlParts(0);
      expect(sql).toContain('ORDER BY "titleMatch" DESC, "updatedAt" DESC');
      expect(values).toContain('ws-1');
      expect(values).toContain(10);
      expect(
        values.some(
          (v) =>
            typeof v === 'object' &&
            v !== null &&
            (v as { values?: unknown[] }).values?.includes('prj-1'),
        ),
      ).toBe(true);
      expect(
        values.some(
          (v) =>
            typeof v === 'object' &&
            v !== null &&
            (v as { values?: unknown[] }).values?.includes('%50\\%%'),
        ),
      ).toBe(true);
    });

    it('для type=content сортирует только по updatedAt и учитывает диапазон дат', async () => {
      const from = new Date('2026-01-01T00:00:00.000Z');
      const to = new Date('2026-02-01T00:00:00.000Z');
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      await repository.search('ws-1', {
        q: 'отчёт',
        type: PageSearchType.CONTENT,
        from,
        to,
        limit: 5,
      });

      const { sql, values } = getSqlParts(0);
      expect(sql).toContain('ORDER BY "updatedAt" DESC');
      expect(sql).not.toContain('ORDER BY "titleMatch" DESC');
      expect(
        values.some(
          (value) =>
            value &&
            typeof value === 'object' &&
            'values' in value &&
            (value as { values: unknown[] }).values.includes(from),
        ),
      ).toBe(true);
      expect(
        values.some(
          (value) =>
            value &&
            typeof value === 'object' &&
            'values' in value &&
            (value as { values: unknown[] }).values.includes(to),
        ),
      ).toBe(true);
    });

    it('собирает path от проекта к документу', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'page-child',
            workspaceId: 'ws-1',
            projectId: 'prj-1',
            parentPageId: 'page-parent',
            title: 'Компоненты',
            icon: null,
            type: 'DOC',
            updatedAt: new Date('2026-03-01T00:00:00.000Z'),
            titleMatch: false,
            pos: 1,
            snippet: 'компоненты',
          },
        ])
        .mockResolvedValueOnce([
          {
            leafId: 'page-child',
            id: 'page-parent',
            parentPageId: null,
            projectId: 'prj-1',
            title: 'Дизайн-система',
            depth: 1,
          },
          {
            leafId: 'page-child',
            id: 'page-child',
            parentPageId: 'page-parent',
            projectId: 'prj-1',
            title: 'Компоненты',
            depth: 0,
          },
        ]);
      mockPrisma.project.findMany.mockResolvedValue([
        { id: 'prj-1', name: 'Документы' },
      ]);

      const [result] = await repository.search('ws-1', {
        q: 'компоненты',
        type: PageSearchType.ALL,
        limit: 10,
      });

      expect(result.path).toEqual([
        { type: 'project', id: 'prj-1', name: 'Документы' },
        { type: 'page', id: 'page-parent', name: 'Дизайн-система' },
        { type: 'page', id: 'page-child', name: 'Компоненты' },
      ]);
    });
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
          workspaceId: 'ws-1',
          json: { type: 'doc', content: [] },
          searchText: '',
        },
      });
      expect(result).toEqual(pageFixture('p3', 3));
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
      expect(result).toEqual(pageFixture('p1', 0));
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
      expect(result[0]).toEqual(pageFixture('p1', 0));
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
        include: undefined,
      });
    });

    it('возвращает страницу по id', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(pageFixture('p1', 0));

      const result = await repository.findById('p1');

      expect(result).toEqual(pageFixture('p1', 0));
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

    it('обновляет и возвращает страницу', async () => {
      const updatedFixture = { ...pageFixture('p1', 0), title: 'New' };
      mockPrisma.page.update.mockResolvedValue(updatedFixture);

      const result = await repository.update('p1', { title: 'New' });

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'p1', deletedAt: null },
        data: { title: 'New' },
      });
      expect(result).toEqual(updatedFixture);
    });
  });

  describe('softDelete', () => {
    it('возвращает false, если страница не найдена (P2025)', async () => {
      mockPrisma.page.update.mockRejectedValue(p2025());

      await expect(repository.softDelete('ghost', 'user-2')).resolves.toBe(
        false,
      );
    });

    it('проставляет deletedAt/deletedBy и возвращает true', async () => {
      mockPrisma.page.update.mockResolvedValue(pageFixture('p1', 0));

      const result = await repository.softDelete('p1', 'user-2');

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'p1', deletedAt: null },
        data: { deletedAt: expect.any(Date) as Date, deletedBy: 'user-2' },
      });
      expect(result).toBe(true);
    });
  });

  describe('restore', () => {
    it('сбрасывает deletedAt/deletedBy у удалённой страницы', async () => {
      const restored = pageFixture('p1', 0);
      mockPrisma.page.update.mockResolvedValue(restored);

      const result = await repository.restore('p1');

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'p1', deletedAt: { not: null } },
        data: { deletedAt: null, deletedBy: null },
      });
      expect(result).toEqual(restored);
    });

    it('возвращает null, если страницы нет в корзине (P2025)', async () => {
      mockPrisma.page.update.mockRejectedValue(p2025());

      await expect(repository.restore('ghost')).resolves.toBeNull();
    });
  });

  describe('hardDelete', () => {
    it('удаляет страницу и возвращает true', async () => {
      mockPrisma.page.delete.mockResolvedValue(pageFixture('p1', 0));

      const result = await repository.hardDelete('p1');

      expect(mockPrisma.page.delete).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
      expect(result).toBe(true);
    });

    it('возвращает false, если страницы нет (P2025)', async () => {
      mockPrisma.page.delete.mockRejectedValue(p2025());

      await expect(repository.hardDelete('ghost')).resolves.toBe(false);
    });
  });

  describe('findTrashedByWorkspaceId', () => {
    it('запрашивает только удалённые страницы с авторами', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      await repository.findTrashedByWorkspaceId('ws-1');

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: 'ws-1', deletedAt: { not: null } },
          orderBy: { deletedAt: 'desc' },
        }),
      );
    });

    it('добавляет текстовый поиск по названию, разделу и удалившему', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      await repository.findTrashedByWorkspaceId('ws-1', 'отчёт');

      const [[arg]] = mockPrisma.page.findMany.mock.calls as Array<
        [{ where: { OR?: unknown[] } }]
      >;
      expect(arg.where.OR).toEqual([
        { title: { contains: 'отчёт', mode: 'insensitive' } },
        {
          project: { is: { name: { contains: 'отчёт', mode: 'insensitive' } } },
        },
        {
          deletedByUser: {
            is: { name: { contains: 'отчёт', mode: 'insensitive' } },
          },
        },
        {
          deletedByUser: {
            is: { email: { contains: 'отчёт', mode: 'insensitive' } },
          },
        },
      ]);
    });

    it('не добавляет OR для пустого поиска', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      await repository.findTrashedByWorkspaceId('ws-1', '   ');

      const [[arg]] = mockPrisma.page.findMany.mock.calls as Array<
        [{ where: { OR?: unknown[] } }]
      >;
      expect(arg.where.OR).toBeUndefined();
    });
  });

  describe('findTrashedForPurge', () => {
    it('возвращает все удалённые страницы воркспейса', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      await repository.findTrashedForPurge('ws-1');

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1', deletedAt: { not: null } },
      });
    });
  });

  describe('findExpiredTrashed', () => {
    it('фильтрует по порогу deletedAt', async () => {
      const before = new Date('2026-08-01T00:00:00.000Z');
      mockPrisma.page.findMany.mockResolvedValue([]);

      await repository.findExpiredTrashed(before);

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: { deletedAt: { not: null, lt: before } },
      });
    });
  });

  describe('findAttachmentKeys', () => {
    it('возвращает ключи вложений страницы', async () => {
      mockPrisma.attachment.findMany.mockResolvedValue([
        { key: 'a.png' },
        { key: 'b.png' },
      ]);

      const result = await repository.findAttachmentKeys('p1');

      expect(mockPrisma.attachment.findMany).toHaveBeenCalledWith({
        where: { pageId: 'p1' },
        select: { key: true },
      });
      expect(result).toEqual(['a.png', 'b.png']);
    });
  });
});
