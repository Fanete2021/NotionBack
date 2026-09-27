import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma';
import { EMPTY_DOCUMENT } from '../constants';
import { PagesVersionRepository } from './pages-version.repository';

describe('PagesVersionRepository', () => {
  let repository: PagesVersionRepository;

  const mockTx = {
    $queryRaw: jest.fn(),
    pageVersion: {
      create: jest.fn(),
    },
    pageContent: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockPrisma = {
    pageVersion: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesVersionRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get(PagesVersionRepository);

    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: typeof mockTx) => unknown) => callback(mockTx),
    );
  });

  describe('findManyByPageId', () => {
    it('не выбирает snapshot и листает курсором', async () => {
      mockPrisma.pageVersion.findMany.mockResolvedValue([]);

      await repository.findManyByPageId('page-1', {
        cursor: 'ver-1',
        take: 21,
      });

      expect(mockPrisma.pageVersion.findMany).toHaveBeenCalledWith({
        where: { pageId: 'page-1' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 21,
        cursor: { id: 'ver-1' },
        skip: 1,
        select: {
          id: true,
          pageId: true,
          authorId: true,
          label: true,
          createdAt: true,
        },
      });
    });
  });

  describe('restore', () => {
    const updatedAt = new Date('2026-09-02T00:00:00.000Z');

    it('в одной транзакции блокирует строку, пишет версию текущего JSON и обновляет только json', async () => {
      const currentJson = { type: 'doc', content: [{ type: 'paragraph' }] };
      const nextJson = { type: 'doc', content: [] };
      const restored = {
        pageId: 'page-1',
        json: nextJson,
        updatedAt,
      };
      mockTx.pageContent.findUnique.mockResolvedValue({
        pageId: 'page-1',
        json: currentJson,
        updatedAt,
      });
      mockTx.pageVersion.create.mockResolvedValue({ id: 'saved' });
      mockTx.pageContent.upsert.mockResolvedValue(restored);

      const result = await repository.restore({
        pageId: 'page-1',
        authorId: 'user-1',
        label: '2026-09-27T06:00:00.000Z',
        nextJson,
      });

      expect(mockTx.$queryRaw).toHaveBeenCalled();
      expect(mockTx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        mockTx.pageContent.findUnique.mock.invocationCallOrder[0],
      );
      expect(
        mockTx.pageContent.findUnique.mock.invocationCallOrder[0],
      ).toBeLessThan(mockTx.pageVersion.create.mock.invocationCallOrder[0]);
      expect(mockTx.pageVersion.create).toHaveBeenCalledWith({
        data: {
          pageId: 'page-1',
          authorId: 'user-1',
          snapshot: currentJson,
          label: '2026-09-27T06:00:00.000Z',
        },
      });
      expect(mockTx.pageContent.upsert).toHaveBeenCalledWith({
        where: { pageId: 'page-1' },
        create: { pageId: 'page-1', json: nextJson },
        update: { json: nextJson },
        select: { pageId: true, json: true, updatedAt: true },
      });
      expect(result).toEqual({ changed: true, content: restored });
    });

    it('не создаёт версию, если JSON совпадает, в том числе при другом порядке ключей', async () => {
      const currentJson = { b: 1, a: { d: 2, c: 3 } };
      mockTx.pageContent.findUnique.mockResolvedValue({
        pageId: 'page-1',
        json: currentJson,
        updatedAt,
      });

      const result = await repository.restore({
        pageId: 'page-1',
        authorId: 'user-1',
        label: '2026-09-27T06:00:00.000Z',
        nextJson: { a: { c: 3, d: 2 }, b: 1 },
      });

      expect(mockTx.pageVersion.create).not.toHaveBeenCalled();
      expect(mockTx.pageContent.upsert).not.toHaveBeenCalled();
      expect(result).toEqual({
        changed: false,
        content: {
          pageId: 'page-1',
          json: currentJson,
          updatedAt,
        },
      });
    });

    it('перед откатом пустой страницы снимает EMPTY_DOCUMENT', async () => {
      const nextJson = { type: 'doc', content: [{ type: 'paragraph' }] };
      mockTx.pageContent.findUnique.mockResolvedValue(null);
      mockTx.pageVersion.create.mockResolvedValue({ id: 'saved' });
      mockTx.pageContent.upsert.mockResolvedValue({
        pageId: 'page-1',
        json: nextJson,
        updatedAt,
      });

      await repository.restore({
        pageId: 'page-1',
        authorId: 'user-1',
        label: '2026-09-27T06:00:00.000Z',
        nextJson,
      });

      expect(mockTx.pageVersion.create).toHaveBeenCalledWith({
        data: {
          pageId: 'page-1',
          authorId: 'user-1',
          snapshot: EMPTY_DOCUMENT,
          label: '2026-09-27T06:00:00.000Z',
        },
      });
    });
  });
});
