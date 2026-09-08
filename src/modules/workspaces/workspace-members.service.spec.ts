import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceMembersService } from '@modules/workspaces/workspace-members.service';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { WorkspacesRepository } from '@modules/workspaces/workspaces.repository';
import { UsersRepository } from '@modules/users/users.repository';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

describe('WorkspaceMembersService', () => {
  let service: WorkspaceMembersService;

  const mockWorkspacesRepository = {
    addMember: jest.fn(),
    findAllMembers: jest.fn(),
    changeRole: jest.fn(),
    removeMember: jest.fn(),
    findMembership: jest.fn(),
    findById: jest.fn(),
  };

  const mockUsersRepository = {
    findById: jest.fn(),
  };

  const membership = (
    role: Role,
  ): { workspaceId: string; userId: string; role: Role } => ({
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
        WorkspaceMembersService,
        WorkspacesService,
        { provide: WorkspacesRepository, useValue: mockWorkspacesRepository },
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<WorkspaceMembersService>(WorkspaceMembersService);
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
      mockUsersRepository.findById.mockResolvedValue({ id: 'user-2' });
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
      mockUsersRepository.findById.mockResolvedValue({ id: 'user-2' });
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
      mockUsersRepository.findById.mockResolvedValue({ id: 'user-2' });
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
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(
        service.addMember('user-1', 'ws-1', 'ghost'),
      ).rejects.toThrow(NotFoundException);
    });

    it('превращает P2002 в 409, если участник уже существует', async () => {
      mockWorkspacesRepository.findMembership.mockResolvedValue(
        membership(Role.OWNER),
      );
      mockUsersRepository.findById.mockResolvedValue({ id: 'user-2' });
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
});
