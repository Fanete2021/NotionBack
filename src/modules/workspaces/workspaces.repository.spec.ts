import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesRepository } from './workspaces.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { WorkspaceEntity } from './entities/workspace.entity';
import { WorkspaceMemberEntity } from './entities/workspace-member.entity';

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
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

  const workspaceFixture = (
    id: string,
    name = 'Workspace',
  ): Record<string, unknown> => ({
    id,
    name,
    ownerId: 'user-1',
    isPublic: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const memberFixture = (
    id: string,
    userId: string,
    role: Role = Role.EDITOR,
  ): Record<string, unknown> => ({
    id,
    workspaceId: 'ws-1',
    userId,
    role,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
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
      (callback: (tx: unknown) => unknown) => callback(mockTx),
    );
  });

  const p2025 = (): Prisma.PrismaClientKnownRequestError =>
    new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });

  describe('create', () => {
    it('создаёт воркспейс и членство OWNER в транзакции', async () => {
      mockTx.workspace.create.mockResolvedValue(workspaceFixture('ws-1'));
      mockTx.workspaceMember.create.mockResolvedValue(
        memberFixture('m1', 'user-1', Role.OWNER),
      );

      const result = await repository.create('user-1', 'My space');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.workspace.create).toHaveBeenCalledWith({
        data: { name: 'My space', ownerId: 'user-1' },
      });
      expect(mockTx.workspaceMember.create).toHaveBeenCalledWith({
        data: { workspaceId: 'ws-1', userId: 'user-1', role: 'OWNER' },
      });
      expect(result).toBeInstanceOf(WorkspaceEntity);
    });
  });

  describe('findById', () => {
    it('возвращает null, если воркспейс не найден', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(null);

      await expect(repository.findById('ghost')).resolves.toBeNull();
    });

    it('возвращает сущность воркспейса', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(
        workspaceFixture('ws-1'),
      );

      const result = await repository.findById('ws-1');

      expect(mockPrisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
      });
      expect(result).toBeInstanceOf(WorkspaceEntity);
      expect(result?.id).toBe('ws-1');
    });
  });

  describe('findAllByUserId', () => {
    it('возвращает воркспейсы по членствам пользователя', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([
        { workspace: workspaceFixture('ws-1'), userId: 'user-1' },
        { workspace: workspaceFixture('ws-2'), userId: 'user-1' },
      ]);

      const result = await repository.findAllByUserId('user-1');

      expect(mockPrisma.workspaceMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { workspace: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(WorkspaceEntity);
    });
  });

  describe('countOwnedBy', () => {
    it('считает воркспейсы по ownerId', async () => {
      mockPrisma.workspace.count.mockResolvedValue(3);

      await expect(repository.countOwnedBy('user-1')).resolves.toBe(3);
      expect(mockPrisma.workspace.count).toHaveBeenCalledWith({
        where: { ownerId: 'user-1' },
      });
    });
  });

  describe('update', () => {
    it('возвращает null, если воркспейс не найден (P2025)', async () => {
      mockPrisma.workspace.update.mockRejectedValue(p2025());

      await expect(
        repository.update('ghost', { name: 'X' }),
      ).resolves.toBeNull();
    });

    it('обновляет и возвращает сущность', async () => {
      mockPrisma.workspace.update.mockResolvedValue(
        workspaceFixture('ws-1', 'New name'),
      );

      const result = await repository.update('ws-1', { name: 'New name' });

      expect(mockPrisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
        data: { name: 'New name' },
      });
      expect(result).toBeInstanceOf(WorkspaceEntity);
      expect(result?.name).toBe('New name');
    });
  });

  describe('delete', () => {
    it('возвращает false, если воркспейс не найден (P2025)', async () => {
      mockPrisma.workspace.delete.mockRejectedValue(p2025());

      await expect(repository.delete('ghost')).resolves.toBe(false);
    });

    it('удаляет и возвращает true', async () => {
      mockPrisma.workspace.delete.mockResolvedValue(workspaceFixture('ws-1'));

      await expect(repository.delete('ws-1')).resolves.toBe(true);
      expect(mockPrisma.workspace.delete).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
      });
    });
  });

  describe('members', () => {
    it('добавляет участника', async () => {
      mockPrisma.workspaceMember.create.mockResolvedValue(
        memberFixture('m1', 'user-2', Role.EDITOR),
      );

      const result = await repository.addMember('ws-1', 'user-2');

      expect(mockPrisma.workspaceMember.create).toHaveBeenCalledWith({
        data: { workspaceId: 'ws-1', userId: 'user-2', role: Role.EDITOR },
      });
      expect(result).toBeInstanceOf(WorkspaceMemberEntity);
    });

    it('возвращает всех участников', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([
        memberFixture('m1', 'user-1', Role.OWNER),
        memberFixture('m2', 'user-2', Role.EDITOR),
      ]);

      const result = await repository.findAllMembers('ws-1');

      expect(mockPrisma.workspaceMember.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(2);
    });

    it('возвращает null, если членство не найдено', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(
        repository.findMembership('ws-1', 'user-2'),
      ).resolves.toBeNull();
    });

    it('находит членство по составному ключу', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(
        memberFixture('m1', 'user-2'),
      );

      const result = await repository.findMembership('ws-1', 'user-2');

      expect(mockPrisma.workspaceMember.findUnique).toHaveBeenCalledWith({
        where: {
          workspaceId_userId: { workspaceId: 'ws-1', userId: 'user-2' },
        },
      });
      expect(result?.userId).toBe('user-2');
    });

    it('меняет роль участника', async () => {
      mockPrisma.workspaceMember.update.mockResolvedValue(
        memberFixture('m1', 'user-2', Role.ADMIN),
      );

      const result = await repository.changeRole('ws-1', 'user-2', Role.ADMIN);

      expect(mockPrisma.workspaceMember.update).toHaveBeenCalledWith({
        where: {
          workspaceId_userId: { workspaceId: 'ws-1', userId: 'user-2' },
        },
        data: { role: Role.ADMIN },
      });
      expect(result?.role).toBe(Role.ADMIN);
    });

    it('возвращает null при смене роли несуществующего членства (P2025)', async () => {
      mockPrisma.workspaceMember.update.mockRejectedValue(p2025());

      await expect(
        repository.changeRole('ws-1', 'ghost', Role.ADMIN),
      ).resolves.toBeNull();
    });

    it('удаляет участника и возвращает true', async () => {
      mockPrisma.workspaceMember.delete.mockResolvedValue(
        memberFixture('m1', 'user-2'),
      );

      await expect(repository.removeMember('ws-1', 'user-2')).resolves.toBe(
        true,
      );
      expect(mockPrisma.workspaceMember.delete).toHaveBeenCalledWith({
        where: {
          workspaceId_userId: { workspaceId: 'ws-1', userId: 'user-2' },
        },
      });
    });

    it('возвращает false при удалении несуществующего членства (P2025)', async () => {
      mockPrisma.workspaceMember.delete.mockRejectedValue(p2025());

      await expect(repository.removeMember('ws-1', 'ghost')).resolves.toBe(
        false,
      );
    });
  });
});
