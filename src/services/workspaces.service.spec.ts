import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesRepository } from '../repositories/workspaces.repository';
import { UsersService } from './users.service';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  const mockWorkspacesRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByUserId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addMember: jest.fn(),
    findAllMembers: jest.fn(),
    changeRole: jest.fn(),
    removeMember: jest.fn(),
    findMembership: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const membership = (role: Role) => ({
    workspaceId: 'ws-1',
    userId: 'user-1',
    role,
  });

  const p2002 = new Prisma.PrismaClientKnownRequestError('duplicate', {
    code: 'P2002',
    clientVersion: 'test',
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: WorkspacesRepository, useValue: mockWorkspacesRepository },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
  });

  describe('create', () => {
    it('создаёт воркспейс, если лимит не превышен', async () => {
      mockConfigService.get.mockReturnValue(3);
      mockWorkspacesRepository.findAllByUserId.mockResolvedValue([
        { id: 'ws-1' },
      ]);
      mockWorkspacesRepository.create.mockResolvedValue({ id: 'ws-2' });

      const result = await service.create('user-1', 'My space');

      expect(mockConfigService.get).toHaveBeenCalledWith(
        'MAX_WORKSPACES_PER_USER',
        3,
      );
      expect(mockWorkspacesRepository.create).toHaveBeenCalledWith(
        'user-1',
        'My space',
      );
      expect(result).toEqual({ id: 'ws-2' });
    });

    it('бросает 403, если лимит воркспейсов превышен', async () => {
      mockConfigService.get.mockReturnValue(3);
      mockWorkspacesRepository.findAllByUserId.mockResolvedValue([
        { id: 'ws-1' },
        { id: 'ws-2' },
        { id: 'ws-3' },
      ]);

      await expect(service.create('user-1', 'X')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockWorkspacesRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('возвращает воркспейс', async () => {
      mockWorkspacesRepository.findById.mockResolvedValue({ id: 'ws-1' });

      await expect(service.findById('ws-1')).resolves.toEqual({ id: 'ws-1' });
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

      await expect(service.findAllByUserId('user-1')).resolves.toEqual([
        { id: 'ws-1' },
      ]);
    });
  });

  describe('update', () => {
    it('обновляет воркспейс', async () => {
      mockWorkspacesRepository.update.mockResolvedValue({
        id: 'ws-1',
        name: 'New name',
      });

      await expect(
        service.update('ws-1', { name: 'New name' }),
      ).resolves.toEqual({ id: 'ws-1', name: 'New name' });
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
    });

    it('бросает 404, если воркспейс не найден', async () => {
      mockWorkspacesRepository.delete.mockResolvedValue(false);

      await expect(service.delete('ws-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMembers', () => {
    it('возвращает участников воркспейса', async () => {
      mockWorkspacesRepository.findAllMembers.mockResolvedValue([
        { workspaceId: 'ws-1', userId: 'user-1' },
      ]);

      await expect(service.listMembers('ws-1')).resolves.toHaveLength(1);
    });
  });

  describe('addMember', () => {
    it('owner добавляет участника с ролью по умолчанию EDITOR', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );
      mockUsersService.findById.mockResolvedValue({ id: 'user-2' });
      mockWorkspacesRepository.addMember.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: Role.EDITOR,
      });

      const result = await service.addMember('user-1', 'ws-1', 'user-2');

      expect(mockWorkspacesRepository.addMember).toHaveBeenCalledWith(
        'ws-1',
        'user-2',
        Role.EDITOR,
      );
      expect(result.role).toBe(Role.EDITOR);
    });

    it('owner может назначить ADMIN', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );
      mockUsersService.findById.mockResolvedValue({ id: 'user-2' });
      mockWorkspacesRepository.addMember.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: Role.ADMIN,
      });

      await service.addMember('user-1', 'ws-1', 'user-2', Role.ADMIN);

      expect(mockWorkspacesRepository.addMember).toHaveBeenCalledWith(
        'ws-1',
        'user-2',
        Role.ADMIN,
      );
    });

    it('admin добавляет участника', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.ADMIN),
      );
      mockUsersService.findById.mockResolvedValue({ id: 'user-2' });
      mockWorkspacesRepository.addMember.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-2',
      });

      await service.addMember('user-1', 'ws-1', 'user-2');
    });

    it('admin не может назначить ADMIN', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.ADMIN),
      );

      await expect(
        service.addMember('user-1', 'ws-1', 'user-2', Role.ADMIN),
      ).rejects.toThrow(ForbiddenException);
      expect(mockWorkspacesRepository.addMember).not.toHaveBeenCalled();
    });

    it('никто не может назначить роль OWNER', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );

      await expect(
        service.addMember('user-1', 'ws-1', 'user-2', Role.OWNER),
      ).rejects.toThrow(ForbiddenException);
      expect(mockWorkspacesRepository.addMember).not.toHaveBeenCalled();
    });

    it('простой участник не может добавлять участников', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.EDITOR),
      );

      await expect(
        service.addMember('user-1', 'ws-1', 'user-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('бросает 404, если пользователь не найден', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        service.addMember('user-1', 'ws-1', 'ghost'),
      ).rejects.toThrow(NotFoundException);
    });

    it('бросает 409, если участник уже существует (P2002)', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );
      mockUsersService.findById.mockResolvedValue({ id: 'user-2' });
      mockWorkspacesRepository.addMember.mockRejectedValue(p2002);

      await expect(
        service.addMember('user-1', 'ws-1', 'user-2'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('changeMemberRole', () => {
    it('owner меняет роль участника', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.OWNER))
        .mockResolvedValueOnce(membership(Role.EDITOR));
      mockWorkspacesRepository.changeRole.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: Role.VIEWER,
      });

      const result = await service.changeMemberRole(
        'user-1',
        'ws-1',
        'user-2',
        Role.VIEWER,
      );

      expect(mockWorkspacesRepository.changeRole).toHaveBeenCalledWith(
        'ws-1',
        'user-2',
        Role.VIEWER,
      );
      expect(result.role).toBe(Role.VIEWER);
    });

    it('owner может назначить админа из участника', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.OWNER))
        .mockResolvedValueOnce(membership(Role.EDITOR))
        .mockResolvedValueOnce(membership(Role.OWNER));
      mockWorkspacesRepository.changeRole.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: Role.ADMIN,
      });

      await service.changeMemberRole('user-1', 'ws-1', 'user-2', Role.ADMIN);

      expect(mockWorkspacesRepository.changeRole).toHaveBeenCalledWith(
        'ws-1',
        'user-2',
        Role.ADMIN,
      );
    });

    it('admin меняет роль обычного участника', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.ADMIN))
        .mockResolvedValueOnce(membership(Role.EDITOR));
      mockWorkspacesRepository.changeRole.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: Role.VIEWER,
      });

      await service.changeMemberRole('user-1', 'ws-1', 'user-2', Role.VIEWER);
    });

    it('admin не может менять роль другого admin', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.ADMIN))
        .mockResolvedValueOnce(membership(Role.ADMIN));

      await expect(
        service.changeMemberRole('user-1', 'ws-1', 'user-2', Role.VIEWER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('admin не может назначить ADMIN', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.ADMIN))
        .mockResolvedValueOnce(membership(Role.EDITOR))
        .mockResolvedValue(membership(Role.EDITOR));

      await expect(
        service.changeMemberRole('user-1', 'ws-1', 'user-2', Role.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('нельзя назначить роль OWNER другому участнику', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.OWNER))
        .mockResolvedValueOnce(membership(Role.EDITOR));

      await expect(
        service.changeMemberRole('user-1', 'ws-1', 'user-2', Role.OWNER),
      ).rejects.toThrow(ForbiddenException);
      expect(mockWorkspacesRepository.changeRole).not.toHaveBeenCalled();
    });

    it('нельзя менять свою собственную роль', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );

      await expect(
        service.changeMemberRole('user-1', 'ws-1', 'user-1', Role.VIEWER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('нельзя менять роль OWNER', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.OWNER))
        .mockResolvedValueOnce({
          workspaceId: 'ws-1',
          userId: 'owner-2',
          role: Role.OWNER,
        });

      await expect(
        service.changeMemberRole('user-1', 'ws-1', 'owner-2', Role.VIEWER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('бросает 404, если целевое членство не найдено', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.OWNER))
        .mockResolvedValueOnce(null);

      await expect(
        service.changeMemberRole('user-1', 'ws-1', 'ghost', Role.VIEWER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('owner удаляет участника', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.OWNER))
        .mockResolvedValueOnce(membership(Role.EDITOR));
      mockWorkspacesRepository.removeMember.mockResolvedValue(true);

      await expect(
        service.removeMember('user-1', 'ws-1', 'user-2'),
      ).resolves.toBeUndefined();
      expect(mockWorkspacesRepository.removeMember).toHaveBeenCalledWith(
        'ws-1',
        'user-2',
      );
    });

    it('admin удаляет обычного участника', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.ADMIN))
        .mockResolvedValueOnce(membership(Role.EDITOR));
      mockWorkspacesRepository.removeMember.mockResolvedValue(true);

      await expect(
        service.removeMember('user-1', 'ws-1', 'user-2'),
      ).resolves.toBeUndefined();
    });

    it('admin не может удалить другого admin', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.ADMIN))
        .mockResolvedValueOnce(membership(Role.ADMIN));

      await expect(
        service.removeMember('user-1', 'ws-1', 'user-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('нельзя удалить самого себя', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );

      await expect(
        service.removeMember('user-1', 'ws-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('нельзя удалить OWNER', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.OWNER))
        .mockResolvedValueOnce({
          workspaceId: 'ws-1',
          userId: 'owner-2',
          role: Role.OWNER,
        });

      await expect(
        service.removeMember('user-1', 'ws-1', 'owner-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('бросает 404, если членство не найдено', async () => {
      mockWorkspacesRepository.findMembership
        .mockResolvedValueOnce(membership(Role.OWNER))
        .mockResolvedValueOnce(null);

      await expect(
        service.removeMember('user-1', 'ws-1', 'ghost'),
      ).rejects.toThrow(NotFoundException);
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

  describe('assertOwner', () => {
    it('пропускает, если роль OWNER', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );

      await expect(
        service.assertOwner('ws-1', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('бросает 403, если роль не OWNER', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.EDITOR),
      );

      await expect(service.assertOwner('ws-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
