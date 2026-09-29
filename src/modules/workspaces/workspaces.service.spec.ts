import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { WorkspacesRepository } from '@modules/workspaces/workspaces.repository';
import { WorkspacesMapper } from '@modules/workspaces/workspaces.mapper';
import { WorkspaceMembersRepository } from '@modules/workspace-members/workspace-members.repository';
import { WorkspaceEntity } from '@modules/workspaces/entities';
import { PrismaService } from '../../prisma';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { provideMockPinoLogger } from '@common/testing';

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  const mockWorkspacesRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findAllByUserId: jest.fn(),
    countOwnedBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockWorkspaceMembersRepository = {
    addMember: jest.fn(),
    findMembership: jest.fn(),
  };

  const mockPrisma = {
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const membership = (
    role: Role,
  ): { workspaceId: string; userId: string; role: Role } => ({
    workspaceId: 'ws-1',
    userId: 'user-1',
    role,
  });

  const workspaceFixture = {
    id: 'ws-1',
    name: 'My space',
    ownerId: 'user-1',
    isPublic: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: object) => unknown) => callback({}),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        WorkspacesMapper,
        { provide: WorkspacesRepository, useValue: mockWorkspacesRepository },
        {
          provide: WorkspaceMembersRepository,
          useValue: mockWorkspaceMembersRepository,
        },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        provideMockPinoLogger(WorkspacesService.name),
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
  });

  describe('create', () => {
    it('создаёт воркспейс и OWNER-членство в транзакции', async () => {
      mockConfigService.get.mockReturnValue(3);
      mockWorkspacesRepository.countOwnedBy.mockResolvedValue(1);
      mockWorkspacesRepository.create.mockResolvedValue(workspaceFixture);
      mockWorkspaceMembersRepository.addMember.mockResolvedValue({});

      const result = await service.create('user-1', 'My space');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockWorkspacesRepository.create).toHaveBeenCalledWith(
        'user-1',
        'My space',
        {},
      );
      expect(mockWorkspaceMembersRepository.addMember).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
        Role.OWNER,
        {},
      );
      expect(result).toBeInstanceOf(WorkspaceEntity);
      expect(result).toMatchObject({ id: 'ws-1', name: 'My space' });
    });

    it('бросает 403, если лимит воркспейсов (по числу OWNED) превышен', async () => {
      mockConfigService.get.mockReturnValue(3);
      mockWorkspacesRepository.countOwnedBy.mockResolvedValue(3);

      await expect(service.create('user-1', 'X')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockWorkspacesRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('возвращает воркспейс, если пользователь — участник', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue(workspaceFixture);
      mockWorkspaceMembersRepository.findMembership.mockResolvedValue(
        membership(Role.EDITOR),
      );

      const result = await service.findById('ws-1', 'user-1');

      expect(result).toBeInstanceOf(WorkspaceEntity);
      expect(result).toMatchObject({ id: 'ws-1', name: 'My space' });
      expect(
        mockWorkspaceMembersRepository.findMembership,
      ).toHaveBeenCalledWith('ws-1', 'user-1');
    });

    it('бросает 404, если воркспейс не найден', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue(null);

      await expect(service.findById('ws-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(
        mockWorkspaceMembersRepository.findMembership,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findAllByUserId', () => {
    it('возвращает воркспейсы пользователя с его ролью', async () => {
      mockWorkspacesRepository.findAllByUserId.mockResolvedValue([
        { role: Role.OWNER, workspace: workspaceFixture },
      ]);

      const result = await service.findAllByUserId('user-1');

      expect(mockWorkspacesRepository.findAllByUserId).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(WorkspaceEntity);
      expect(result[0]).toMatchObject({ id: 'ws-1', role: Role.OWNER });
    });
  });

  describe('update', () => {
    it('обновляет воркспейс', async () => {
      mockWorkspaceMembersRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );
      mockWorkspacesRepository.update.mockResolvedValue({
        ...workspaceFixture,
        name: 'New name',
      });

      const result = await service.update('ws-1', 'user-1', {
        name: 'New name',
      });

      expect(result).toBeInstanceOf(WorkspaceEntity);
      expect(result).toMatchObject({ id: 'ws-1', name: 'New name' });
    });

    it('бросает 403, если обновляет не владелец воркспейса', async () => {
      mockWorkspaceMembersRepository.findMembership.mockResolvedValue(
        membership(Role.EDITOR),
      );

      await expect(
        service.update('ws-1', 'user-1', { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('удаляет воркспейс', async () => {
      mockWorkspaceMembersRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );
      mockWorkspacesRepository.delete.mockResolvedValue(true);

      await expect(service.delete('ws-1', 'user-1')).resolves.toBeUndefined();
    });
  });

  describe('assertMemberOf', () => {
    it('пропускает, если пользователь — участник', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue({ id: 'ws-1' });
      mockWorkspaceMembersRepository.findMembership.mockResolvedValue(
        membership(Role.EDITOR),
      );

      await expect(
        service.assertMemberOf('ws-1', 'user-1'),
      ).resolves.toBeUndefined();
    });
  });
});
