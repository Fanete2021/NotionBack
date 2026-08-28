import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role } from '@prisma/client';
import { WorkspacesRepository } from './workspaces.repository';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { WorkspaceMemberEntity } from '../entities/workspace-member.entity';

describe('WorkspacesRepository', () => {
  let repository: WorkspacesRepository;

  const mockTx = {
    workspace: { create: jest.fn() },
    workspaceMember: { create: jest.fn() },
  };

  const mockPrisma = {
    workspace: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    workspaceMember: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const workspaceFixture = {
    id: 'ws-1',
    name: 'My space',
    ownerId: 'user-1',
    isPublic: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const memberFixture = {
    id: 'mem-1',
    workspaceId: 'ws-1',
    userId: 'user-1',
    role: Role.OWNER,
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

    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: typeof mockTx) => unknown) => callback(mockTx),
    );
  });

  describe('create', () => {
    it('создаёт воркспейс и OWNER-членство в одной транзакции', async () => {
      mockTx.workspace.create.mockResolvedValue(workspaceFixture);
      mockTx.workspaceMember.create.mockResolvedValue(memberFixture);

      const result = await repository.create('user-1', 'My space');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.workspace.create).toHaveBeenCalledWith({
        data: { name: 'My space', ownerId: 'user-1' },
      });
      expect(mockTx.workspaceMember.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'ws-1',
          userId: 'user-1',
          role: 'OWNER',
        },
      });
      expect(result).toBeInstanceOf(WorkspaceEntity);
      expect(result.id).toBe('ws-1');
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

  describe('findAllByUserId', () => {
    it('возвращает воркспейсы из членств пользователя', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([
        { workspace: workspaceFixture },
      ]);

      const result = await repository.findAllByUserId('user-1');

      expect(mockPrisma.workspaceMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { workspace: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(WorkspaceEntity);
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

    it('пробрасывает неожиданную ошибку', async () => {
      const error = new Error('db down');
      mockPrisma.workspace.update.mockRejectedValue(error);

      await expect(repository.update('ws-1', { name: 'X' })).rejects.toThrow(
        error,
      );
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

  describe('addMember', () => {
    it('добавляет участника с ролью по умолчанию EDITOR', async () => {
      mockPrisma.workspaceMember.create.mockResolvedValue({
        ...memberFixture,
        userId: 'user-2',
        role: Role.EDITOR,
      });

      const result = await repository.addMember('ws-1', 'user-2');

      expect(mockPrisma.workspaceMember.create).toHaveBeenCalledWith({
        data: { workspaceId: 'ws-1', userId: 'user-2', role: Role.EDITOR },
      });
      expect(result).toBeInstanceOf(WorkspaceMemberEntity);
      expect(result.role).toBe(Role.EDITOR);
    });
  });

  describe('findAllMembers', () => {
    it('возвращает участников воркспейса', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([memberFixture]);

      const result = await repository.findAllMembers('ws-1');

      expect(mockPrisma.workspaceMember.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(WorkspaceMemberEntity);
    });
  });

  describe('changeRole', () => {
    it('меняет роль участника', async () => {
      mockPrisma.workspaceMember.update.mockResolvedValue({
        ...memberFixture,
        userId: 'user-2',
        role: Role.ADMIN,
      });

      const result = await repository.changeRole('ws-1', 'user-2', Role.ADMIN);

      expect(mockPrisma.workspaceMember.update).toHaveBeenCalledWith({
        where: {
          workspaceId_userId: { workspaceId: 'ws-1', userId: 'user-2' },
        },
        data: { role: Role.ADMIN },
      });
      expect(result?.role).toBe(Role.ADMIN);
    });

    it('возвращает null при P2025', async () => {
      mockPrisma.workspaceMember.update.mockRejectedValue(p2025);

      await expect(
        repository.changeRole('ws-1', 'ghost', Role.EDITOR),
      ).resolves.toBeNull();
    });
  });

  describe('removeMember', () => {
    it('удаляет участника', async () => {
      mockPrisma.workspaceMember.delete.mockResolvedValue(memberFixture);

      await expect(repository.removeMember('ws-1', 'user-2')).resolves.toBe(
        true,
      );
      expect(mockPrisma.workspaceMember.delete).toHaveBeenCalledWith({
        where: {
          workspaceId_userId: { workspaceId: 'ws-1', userId: 'user-2' },
        },
      });
    });

    it('возвращает false при P2025', async () => {
      mockPrisma.workspaceMember.delete.mockRejectedValue(p2025);

      await expect(repository.removeMember('ws-1', 'ghost')).resolves.toBe(
        false,
      );
    });
  });

  describe('findMembership', () => {
    it('возвращает членство', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(memberFixture);

      const result = await repository.findMembership('ws-1', 'user-1');

      expect(mockPrisma.workspaceMember.findUnique).toHaveBeenCalledWith({
        where: {
          workspaceId_userId: { workspaceId: 'ws-1', userId: 'user-1' },
        },
      });
      expect(result).toBeInstanceOf(WorkspaceMemberEntity);
    });

    it('возвращает null, если членство не найдено', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(
        repository.findMembership('ws-1', 'ghost'),
      ).resolves.toBeNull();
    });
  });
});
