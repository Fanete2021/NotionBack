import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { WorkspacesRepository } from '@modules/workspaces/workspaces.repository';
import { PrismaService } from '../../prisma';
import { WorkspaceEntity } from '@modules/workspaces/entities';

describe('WorkspacesRepository', () => {
  let repository: WorkspacesRepository;

  const mockPrisma = {
    workspace: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    workspaceMember: {
      findMany: jest.fn(),
    },
  };

  const workspaceFixture = {
    id: 'ws-1',
    name: 'My space',
    ownerId: 'user-1',
    isPublic: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const p2025 = new Prisma.PrismaClientKnownRequestError('not found', {
    code: 'P2025',
    clientVersion: 'test',
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<WorkspacesRepository>(WorkspacesRepository);
  });

  describe('create', () => {
    it('создаёт воркспейс', async () => {
      mockPrisma.workspace.create.mockResolvedValue(workspaceFixture);

      const result = await repository.create('user-1', 'My space');

      expect(mockPrisma.workspace.create).toHaveBeenCalledWith({
        data: { name: 'My space', ownerId: 'user-1' },
      });
      expect(result).toBeInstanceOf(WorkspaceEntity);
      expect(result.id).toBe('ws-1');
    });

    it('использует переданную транзакцию', async () => {
      const tx = {
        workspace: { create: jest.fn().mockResolvedValue(workspaceFixture) },
      };

      await repository.create('user-1', 'My space', tx as never);

      expect(tx.workspace.create).toHaveBeenCalled();
      expect(mockPrisma.workspace.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('возвращает воркспейс', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(workspaceFixture);

      const result = await repository.findById('ws-1');

      expect(mockPrisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
      });
      expect(result).toBeInstanceOf(WorkspaceEntity);
    });

    it('возвращает null, если воркспейс не найден', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(null);

      await expect(repository.findById('missing')).resolves.toBeNull();
    });
  });

  describe('findByIds', () => {
    it('возвращает воркспейсы в порядке переданных id', async () => {
      mockPrisma.workspace.findMany.mockResolvedValue([
        workspaceFixture,
        { ...workspaceFixture, id: 'ws-2', name: 'Second' },
      ]);

      const result = await repository.findByIds(['ws-1', 'ws-2']);

      expect(mockPrisma.workspace.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['ws-1', 'ws-2'] } },
      });
      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('ws-1');
      expect(result[1]?.id).toBe('ws-2');
    });

    it('возвращает пустой массив для пустого списка id', async () => {
      await expect(repository.findByIds([])).resolves.toEqual([]);
      expect(mockPrisma.workspace.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findAllByUserId', () => {
    it('возвращает воркспейсы пользователя в порядке членства', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([
        { workspace: workspaceFixture },
        {
          workspace: {
            ...workspaceFixture,
            id: 'ws-2',
            name: 'Second',
          },
        },
      ]);

      const result = await repository.findAllByUserId('user-1');

      expect(mockPrisma.workspaceMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { workspace: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('ws-1');
      expect(result[1]?.id).toBe('ws-2');
    });
  });

  describe('countOwnedBy', () => {
    it('считает воркспейсы, которыми владеет пользователь', async () => {
      mockPrisma.workspace.count.mockResolvedValue(2);

      await expect(repository.countOwnedBy('user-1')).resolves.toBe(2);
      expect(mockPrisma.workspace.count).toHaveBeenCalledWith({
        where: { ownerId: 'user-1' },
      });
    });
  });

  describe('update', () => {
    it('обновляет воркспейс', async () => {
      mockPrisma.workspace.update.mockResolvedValue({
        ...workspaceFixture,
        name: 'New name',
      });

      const result = await repository.update('ws-1', { name: 'New name' });

      expect(mockPrisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
        data: { name: 'New name' },
      });
      expect(result).toBeInstanceOf(WorkspaceEntity);
      expect(result?.name).toBe('New name');
    });

    it('возвращает null при P2025', async () => {
      mockPrisma.workspace.update.mockRejectedValue(p2025);

      await expect(
        repository.update('missing', { name: 'X' }),
      ).resolves.toBeNull();
    });
  });

  describe('delete', () => {
    it('удаляет воркспейс', async () => {
      mockPrisma.workspace.delete.mockResolvedValue(workspaceFixture);

      await expect(repository.delete('ws-1')).resolves.toBe(true);
      expect(mockPrisma.workspace.delete).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
      });
    });

    it('возвращает false при P2025', async () => {
      mockPrisma.workspace.delete.mockRejectedValue(p2025);

      await expect(repository.delete('missing')).resolves.toBe(false);
    });
  });
});
