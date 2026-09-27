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

import { provideMockPinoLogger } from '@common/testing';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PageVersion, Prisma } from '@prisma/client';
import { PAGE_VERSIONS_DEFAULT_LIMIT } from './consts';
import { PagesVersionRepository } from './pages-version.repository';
import { PagesVersionService } from './pages-version.service';
import { PageVersionListItem } from './types';

describe('PagesVersionService', () => {
  let service: PagesVersionService;

  const mockRepository = {
    findById: jest.fn(),
    findManyByPageId: jest.fn(),
    restore: jest.fn(),
  };

  const updatedAt = new Date('2026-09-02T00:00:00.000Z');

  const versionFixture = (snapshot: Prisma.JsonValue): PageVersion => ({
    id: 'ver-1',
    pageId: 'page-1',
    authorId: 'author-1',
    snapshot,
    label: '2026-09-01T00:00:00.000Z',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
  });

  const listItem = (id: string): PageVersionListItem => ({
    id,
    pageId: 'page-1',
    authorId: 'author-1',
    label: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesVersionService,
        { provide: PagesVersionRepository, useValue: mockRepository },
        { provide: 'BullQueue_page-versions', useValue: { add: jest.fn() } },
        provideMockPinoLogger(PagesVersionService.name),
      ],
    }).compile();

    service = module.get(PagesVersionService);
  });

  describe('findById', () => {
    it('бросает 404, если версии нет', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('передаёт курсор и отдаёт nextCursor, если есть следующая страница', async () => {
      mockRepository.findManyByPageId.mockResolvedValue([
        listItem('v1'),
        listItem('v2'),
        listItem('v3'),
      ]);

      const result = await service.list('page-1', {
        cursor: 'v0',
        limit: 2,
      });

      expect(mockRepository.findManyByPageId).toHaveBeenCalledWith('page-1', {
        cursor: 'v0',
        take: 3,
      });
      expect(result.items.map((item) => item.id)).toEqual(['v1', 'v2']);
      expect(result.nextCursor).toBe('v2');
    });

    it('берёт лимит по умолчанию и возвращает nextCursor null', async () => {
      mockRepository.findManyByPageId.mockResolvedValue([listItem('v1')]);

      const result = await service.list('page-1', {});

      expect(mockRepository.findManyByPageId).toHaveBeenCalledWith('page-1', {
        cursor: undefined,
        take: PAGE_VERSIONS_DEFAULT_LIMIT + 1,
      });
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('restore', () => {
    it('отдаёт снимок в транзакцию и не читает контент заранее', async () => {
      const targetJson = { type: 'doc', content: [] };
      const restored = {
        pageId: 'page-1',
        json: targetJson,
        updatedAt,
      };
      mockRepository.restore.mockResolvedValue({
        content: restored,
        changed: true,
      });

      const result = await service.restore(
        versionFixture(targetJson),
        'user-1',
      );

      expect(mockRepository.restore).toHaveBeenCalledWith({
        pageId: 'page-1',
        authorId: 'user-1',
        label: expect.any(String) as string,
        nextJson: targetJson,
      });
      expect(mockRepository.restore).toHaveBeenCalledTimes(1);
      expect(result).toEqual(restored);
    });
  });
});
