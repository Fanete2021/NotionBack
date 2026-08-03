import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsRepository } from './projects.repository';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectEntity } from '../entities/project.entity';

describe('ProjectsRepository', () => {
  let repository: ProjectsRepository;

  const mockProjectUpdate = jest.fn();
  const mockTx = { project: { update: mockProjectUpdate } };

  const mockPrisma = {
    project: {
      count: jest.fn(),
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
      (callback: (tx: unknown) => unknown) => callback(mockTx),
    );
  });

  describe('reorder', () => {
    it('возвращает null, если orderedIds не содержит всех соседей', async () => {
      mockPrisma.project.findMany.mockResolvedValue([
        projectFixture('p1', 0),
        projectFixture('p2', 1),
      ]);

      const result = await repository.reorder('ws-1', null, ['p1']);

      expect(result).toBeNull();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('возвращает null, если orderedIds содержит лишние id', async () => {
      mockPrisma.project.findMany.mockResolvedValue([projectFixture('p1', 0)]);

      const result = await repository.reorder('ws-1', null, ['p1', 'p2']);

      expect(result).toBeNull();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('обновляет позиции в транзакции и возвращает дерево', async () => {
      mockPrisma.project.findMany
        .mockResolvedValueOnce([
          projectFixture('p1', 0),
          projectFixture('p2', 1),
        ])
        .mockResolvedValue([projectFixture('p1', 0), projectFixture('p2', 1)]);

      const result = await repository.reorder('ws-1', null, ['p2', 'p1']);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockProjectUpdate).toHaveBeenNthCalledWith(1, {
        where: { id: 'p2' },
        data: { position: 0 },
      });
      expect(mockProjectUpdate).toHaveBeenNthCalledWith(2, {
        where: { id: 'p1' },
        data: { position: 1 },
      });
      expect(result).toHaveLength(2);
      expect(result?.[0]).toBeInstanceOf(ProjectEntity);
    });
  });
});
