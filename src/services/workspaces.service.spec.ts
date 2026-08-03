import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesRepository } from '../repositories/workspaces.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  const mockWorkspacesRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByUserId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    findMembership: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: WorkspacesRepository, useValue: mockWorkspacesRepository },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
  });

  describe('create', () => {
    it('создаёт воркспейс от имени owner', async () => {
      mockWorkspacesRepository.create.mockResolvedValue({ id: 'ws-1' });

      const result = await service.create('user-1', 'My space');

      expect(mockWorkspacesRepository.create).toHaveBeenCalledWith(
        'user-1',
        'My space',
      );
      expect(result).toEqual({ id: 'ws-1' });
    });
  });

  describe('findById', () => {
    it('возвращает воркспейс', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue({ id: 'ws-1' });

      const result = await service.findById('ws-1');

      expect(result).toEqual({ id: 'ws-1' });
    });

    it('бросает 404, если воркспейс не найден', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue(null);

      await expect(service.findById('ws-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByUserId', () => {
    it('возвращает список воркспейсов пользователя', async () => {
      mockWorkspacesRepository.findAllByUserId.mockResolvedValue([
        { id: 'ws-1' },
      ]);

      const result = await service.findAllByUserId('user-1');

      expect(mockWorkspacesRepository.findAllByUserId).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result).toEqual([{ id: 'ws-1' }]);
    });
  });

  describe('update', () => {
    it('обновляет воркспейс', async () => {
      mockWorkspacesRepository.update.mockResolvedValue({
        id: 'ws-1',
        name: 'New name',
      });

      const result = await service.update('ws-1', { name: 'New name' });

      expect(mockWorkspacesRepository.update).toHaveBeenCalledWith('ws-1', {
        name: 'New name',
      });
      expect(result).toEqual({ id: 'ws-1', name: 'New name' });
    });

    it('бросает 404, если воркспейс не найден', async () => {
      mockWorkspacesRepository.update.mockResolvedValue(null);

      await expect(service.update('ws-1', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('удаляет воркспейс', async () => {
      mockWorkspacesRepository.delete.mockResolvedValue(true);

      await expect(service.delete('ws-1')).resolves.toBeUndefined();
      expect(mockWorkspacesRepository.delete).toHaveBeenCalledWith('ws-1');
    });

    it('бросает 404, если воркспейс не найден', async () => {
      mockWorkspacesRepository.delete.mockResolvedValue(false);

      await expect(service.delete('ws-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addMember', () => {
    it('добавляет участника', async () => {
      mockWorkspacesRepository.addMember.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-2',
      });

      const result = await service.addMember('ws-1', 'user-2');

      expect(mockWorkspacesRepository.addMember).toHaveBeenCalledWith(
        'ws-1',
        'user-2',
      );
      expect(result).toEqual({ workspaceId: 'ws-1', userId: 'user-2' });
    });
  });

  describe('removeMember', () => {
    it('удаляет участника', async () => {
      mockWorkspacesRepository.removeMember.mockResolvedValue(true);

      await expect(
        service.removeMember('ws-1', 'user-2'),
      ).resolves.toBeUndefined();
      expect(mockWorkspacesRepository.removeMember).toHaveBeenCalledWith(
        'ws-1',
        'user-2',
      );
    });

    it('бросает 404, если membership не найден', async () => {
      mockWorkspacesRepository.removeMember.mockResolvedValue(false);

      await expect(service.removeMember('ws-1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assertMemberOf', () => {
    it('пропускает, если пользователь — участник воркспейса', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue({ id: 'ws-1' });
      mockWorkspacesRepository.findMembership.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: Role.MEMBER,
      });

      await expect(
        service.assertMemberOf('ws-1', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('бросает 404, если воркспейс не найден', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue(null);

      await expect(service.assertMemberOf('ws-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockWorkspacesRepository.findMembership).not.toHaveBeenCalled();
    });

    it('бросает 403, если пользователь не участник', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue({ id: 'ws-1' });
      mockWorkspacesRepository.findMembership.mockResolvedValue(null);

      await expect(service.assertMemberOf('ws-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertOwner', () => {
    it('пропускает, если роль OWNER', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: Role.OWNER,
      });

      await expect(
        service.assertOwner('ws-1', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('бросает 404, если membership не найден', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(null);

      await expect(service.assertOwner('ws-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('бросает 403, если роль не OWNER', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: Role.MEMBER,
      });

      await expect(service.assertOwner('ws-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
