import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role } from '@prisma/client';
import { WorkspaceMembersRepository } from '@modules/workspaces/workspace-members.repository';
import { PrismaService } from '../../prisma';
import { WorkspaceMemberEntity } from '@modules/workspaces/entities';

describe('WorkspaceMembersRepository', () => {
  let repository: WorkspaceMembersRepository;

  const mockPrisma = {
    workspaceMember: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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
        WorkspaceMembersRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<WorkspaceMembersRepository>(
      WorkspaceMembersRepository,
    );
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

  describe('findAllByUserId', () => {
    it('возвращает членства пользователя', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([memberFixture]);

      const result = await repository.findAllByUserId('user-1');

      expect(mockPrisma.workspaceMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(WorkspaceMemberEntity);
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
