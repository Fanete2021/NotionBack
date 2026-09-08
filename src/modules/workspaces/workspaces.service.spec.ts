import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { WorkspacesRepository } from '@modules/workspaces/workspaces.repository';
import { WorkspaceMembersRepository } from '@modules/workspaces/workspace-members.repository';
import { PrismaService } from '../../prisma';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  const mockWorkspacesRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    countOwnedBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockWorkspaceMembersRepository = {
    addMember: jest.fn(),
    findAllByUserId: jest.fn(),
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

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: object) => unknown) => callback({}),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: WorkspacesRepository, useValue: mockWorkspacesRepository },
        {
          provide: WorkspaceMembersRepository,
          useValue: mockWorkspaceMembersRepository,
        },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
  });

  describe('create', () => {
    it('создаёт воркспейс и OWNER-членство в транзакции', async () => {
      mockConfigService.get.mockReturnValue(3);
      mockWorkspacesRepository.countOwnedBy.mockResolvedValue(1);
      mockWorkspacesRepository.create.mockResolvedValue({ id: 'ws-2' });
      mockWorkspaceMembersRepository.addMember.mockResolvedValue({});

      const result = await service.create('user-1', 'My space');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockWorkspacesRepository.create).toHaveBeenCalledWith(
        'user-1',
        'My space',
        {},
      );
      expect(mockWorkspaceMembersRepository.addMember).toHaveBeenCalledWith(
        'ws-2',
        'user-1',
        Role.OWNER,
        {},
      );
      expect(result).toEqual({ id: 'ws-2' });
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
      const workspace = { id: 'ws-1' };
      mockWorkspacesRepository.findById.mockResolvedValue(workspace);
      mockWorkspaceMembersRepository.findMembership.mockResolvedValue(
        membership(Role.EDITOR),
      );

      await expect(service.findById('ws-1', 'user-1')).resolves.toBe(workspace);
      expect(mockWorkspaceMembersRepository.findMembership).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
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
    it('возвращает список воркспейсов пользователя', async () => {
      mockWorkspaceMembersRepository.findAllByUserId.mockResolvedValue([
        { workspaceId: 'ws-1' },
      ]);
      mockWorkspacesRepository.findByIds.mockResolvedValue([{ id: 'ws-1' }]);

      await expect(service.findAllByUserId('user-1')).resolves.toEqual([
        { id: 'ws-1' },
      ]);
      expect(mockWorkspacesRepository.findByIds).toHaveBeenCalledWith(['ws-1']);
    });
  });

  describe('update', () => {
    it('обновляет воркспейс', async () => {
      mockWorkspaceMembersRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );
      mockWorkspacesRepository.update.mockResolvedValue({
        id: 'ws-1',
        name: 'New name',
      });

      await expect(
        service.update('ws-1', 'user-1', { name: 'New name' }),
      ).resolves.toEqual({ id: 'ws-1', name: 'New name' });
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
