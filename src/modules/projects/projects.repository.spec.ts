import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsRepository } from './projects.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectEntity } from './entities/project.entity';

describe('ProjectsRepository', () => {
  let repository: ProjectsRepository;

  const mockTx = {
    project: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };

  const mockPrisma = {
    project: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const projectFixture = (
    id: string,
    position: number,
    parentProjectId: string | null = null,
  ): Record<string, unknown> => ({
    id,
    workspaceId: 'ws-1',
    parentProjectId,
    name: `Project ${id}`,
    color: null,
    icon: null,
    position,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<ProjectsRepository>(ProjectsRepository);

    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: typeof mockTx) => unknown) => callback(mockTx),
    );
    mockTx.$queryRaw.mockResolvedValue([{ pg_advisory_xact_lock: true }]);
    mockTx.$executeRaw.mockResolvedValue(1);
  });

  describe('create', () => {
    it('вычисляет позицию как максимальную + 1 внутри транзакции', async () => {
      mockTx.project.aggregate.mockResolvedValue({ _max: { position: 2 } });
      mockTx.project.create.mockResolvedValue(projectFixture('p3', 3));

      const result = await repository.create('ws-1', { name: 'P3' });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.$queryRaw).toHaveBeenCalled();
      expect(mockTx.project.aggregate).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1', parentProjectId: null },
        _max: { position: true },
      });
      expect(mockTx.project.create).toHaveBeenCalledWith({
        data: { name: 'P3', workspaceId: 'ws-1', position: 3 },
      });
      expect(result).toBeInstanceOf(ProjectEntity);
    });

    it('вычисляет позицию 0, если проектов ещё нет', async () => {
      mockTx.project.aggregate.mockResolvedValue({
        _max: { position: null },
      });
      mockTx.project.create.mockResolvedValue(projectFixture('p1', 0));

      const result = await repository.create('ws-1', { name: 'P1' });

      expect(mockTx.project.create).toHaveBeenCalledWith({
        data: { name: 'P1', workspaceId: 'ws-1', position: 0 },
      });
      expect(result).toBeInstanceOf(ProjectEntity);
    });
  });

  describe('reorder', () => {
    it('возвращает null, если orderedIds не содержит всех соседей', async () => {
      mockTx.project.findMany.mockResolvedValue([
        projectFixture('p1', 0),
        projectFixture('p2', 1),
      ]);

      const result = await repository.reorder('ws-1', null, ['p1']);

      expect(result).toBeNull();
      expect(mockTx.$executeRaw).not.toHaveBeenCalled();
    });

    it('возвращает null, если orderedIds содержит лишние id', async () => {
      mockTx.project.findMany.mockResolvedValue([projectFixture('p1', 0)]);

      const result = await repository.reorder('ws-1', null, ['p1', 'p2']);

      expect(result).toBeNull();
      expect(mockTx.$executeRaw).not.toHaveBeenCalled();
    });

    it('обновляет позиции двумя bulk UPDATE и возвращает плоский список', async () => {
      mockTx.project.findMany
        .mockResolvedValueOnce([
          projectFixture('p1', 0),
          projectFixture('p2', 1),
        ])
        .mockResolvedValue([projectFixture('p2', 0), projectFixture('p1', 1)]);

      const result = await repository.reorder('ws-1', null, ['p2', 'p1']);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.project.update).not.toHaveBeenCalled();
      expect(mockTx.$executeRaw).toHaveBeenCalledTimes(2);
      const executeCalls = mockTx.$executeRaw.mock.calls as unknown[][];
      expect(String(executeCalls[0][0])).toContain(
        'SET "position" = "position" +',
      );
      expect(String(executeCalls[1][0])).toContain('FROM (VALUES');

      expect(result).toHaveLength(2);
      expect(result?.[0]).toBeInstanceOf(ProjectEntity);
    });
  });
});
