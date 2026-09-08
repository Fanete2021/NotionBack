import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { WorkspacesRepository } from '@modules/workspaces/workspaces.repository';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  const mockWorkspacesRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByUserId: jest.fn(),
    countOwnedBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMembership: jest.fn(),
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: WorkspacesRepository, useValue: mockWorkspacesRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
  });

  describe('create', () => {
    it('создаёт воркспейс, если лимит не превышен', async () => {
      mockConfigService.get.mockReturnValue(3);
      mockWorkspacesRepository.countOwnedBy.mockResolvedValue(1);
      mockWorkspacesRepository.create.mockResolvedValue({ id: 'ws-2' });

      const result = await service.create('user-1', 'My space');

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'MAX_WORKSPACES_PER_USER',
        3,
      );
      expect(mockWorkspacesRepository.countOwnedBy).toHaveBeenCalledWith(
        'user-1',
      );
      expect(mockWorkspacesRepository.create).toHaveBeenCalledWith(
        'user-1',
        'My space',
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

    it('не считает чужие воркспейсы, где юзер просто участник', async () => {
      mockConfigService.get.mockReturnValue(3);
      mockWorkspacesRepository.countOwnedBy.mockResolvedValue(0);
      mockWorkspacesRepository.create.mockResolvedValue({ id: 'ws-2' });

      await expect(service.create('user-1', 'X')).resolves.toEqual({
        id: 'ws-2',
      });
      expect(mockWorkspacesRepository.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('возвращает воркспейс, если пользователь — участник', async () => {
      const workspace = { id: 'ws-1' };
      mockWorkspacesRepository.findById.mockResolvedValue(workspace);
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.EDITOR),
      );

      await expect(service.findById('ws-1', 'user-1')).resolves.toBe(workspace);

      expect(mockWorkspacesRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockWorkspacesRepository.findById).toHaveBeenCalledWith('ws-1');
      expect(mockWorkspacesRepository.findMembership).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
    });

    it('бросает 404, если воркспейс не найден, и не смотрит membership', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue(null);

      await expect(service.findById('ws-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockWorkspacesRepository.findMembership).not.toHaveBeenCalled();
    });

    it('бросает 403, если воркспейс есть, а пользователь не участник', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue({ id: 'ws-1' });
      mockWorkspacesRepository.findMembership.mockResolvedValue(null);

      await expect(service.findById('ws-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockWorkspacesRepository.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllByUserId', () => {
    it('возвращает список воркспейсов пользователя', async () => {
      mockWorkspacesRepository.findAllByUserId.mockResolvedValue([
        { id: 'ws-1' },
      ]);

      await expect(service.findAllByUserId('user-1')).resolves.toEqual([
        { id: 'ws-1' },
      ]);
    });
  });

  describe('update', () => {
    it('обновляет воркспейс', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
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

    it('бросает 404, если воркспейс не найден', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );
      mockWorkspacesRepository.update.mockResolvedValue(null);

      await expect(
        service.update('ws-1', 'user-1', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('бросает 403, если обновляет не владелец воркспейса', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.EDITOR),
      );

      await expect(
        service.update('ws-1', 'user-1', { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('удаляет воркспейс', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );
      mockWorkspacesRepository.delete.mockResolvedValue(true);

      await expect(service.delete('ws-1', 'user-1')).resolves.toBeUndefined();
    });

    it('бросает 404, если воркспейс не найден', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );
      mockWorkspacesRepository.delete.mockResolvedValue(false);

      await expect(service.delete('ws-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('бросает 403, если удаляет не владелец воркспейса', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.EDITOR),
      );

      await expect(service.delete('ws-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertMemberOf', () => {
    it('пропускает, если пользователь — участник', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue({ id: 'ws-1' });
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.EDITOR),
      );

      await expect(
        service.assertMemberOf('ws-1', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('бросает 404, если воркспейс не найден', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue(null);

      await expect(service.assertMemberOf('ws-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('бросает 403, если пользователь не участник', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue({ id: 'ws-1' });
      mockWorkspacesRepository.findMembership.mockResolvedValue(null);

      await expect(service.assertMemberOf('ws-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
