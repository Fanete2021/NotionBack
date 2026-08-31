import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { WorkspaceInvitesService } from './workspace-invites.service';
import { WorkspaceInvitesRepository } from './workspace-invites.repository';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { RedisClient } from '../../common/providers/redis-client';
import { WorkspaceInviteType } from './types/workspace-invite.types';

describe('WorkspaceInvitesService', () => {
  let service: WorkspaceInvitesService;

  const mockInvitesRepository = {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    findAllByWorkspaceId: jest.fn(),
    countByWorkspaceId: jest.fn(),
    deleteById: jest.fn(),
  };
  const mockWorkspacesService = {
    assertCanManageMembers: jest.fn(),
    addMemberViaInvite: jest.fn(),
  };
  const mockRedis = {
    set: jest.fn(),
    ttl: jest.fn(),
    getdel: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: unknown) => {
        if (key === 'INVITE_TTL_SECONDS') return 86400;
        if (key === 'FRONT_URL') return 'http://localhost:3000';
        if (key === 'MAX_INVITES_PER_WORKSPACE') return 10;
        return defaultValue;
      },
    );
    mockInvitesRepository.countByWorkspaceId.mockResolvedValue(0);

    const module = await Test.createTestingModule({
      providers: [
        WorkspaceInvitesService,
        {
          provide: WorkspaceInvitesRepository,
          useValue: mockInvitesRepository,
        },
        { provide: WorkspacesService, useValue: mockWorkspacesService },
        { provide: RedisClient, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WorkspaceInvitesService>(WorkspaceInvitesService);
  });

  describe('create', () => {
    it('создаёт временную ссылку в Redis с TTL', async () => {
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.create(
        'actor-1',
        'ws-1',
        WorkspaceInviteType.TEMPORARY,
        Role.EDITOR,
      );

      expect(mockWorkspacesService.assertCanManageMembers).toHaveBeenCalledWith(
        'ws-1',
        'actor-1',
      );
      expect(mockRedis.set).toHaveBeenCalledTimes(1);

      const setCall = mockRedis.set.mock.calls[0] as unknown as [
        string,
        string,
        string,
        number,
      ];
      const [key, value, ex, ttl] = setCall;
      expect(key.startsWith('workspace_invite:')).toBe(true);
      expect(JSON.parse(value)).toEqual({
        workspaceId: 'ws-1',
        role: Role.EDITOR,
        createdBy: 'actor-1',
      });
      expect(ex).toBe('EX');
      expect(ttl).toBe(86400);

      expect(result.type).toBe(WorkspaceInviteType.TEMPORARY);
      expect(result.role).toBe(Role.EDITOR);
      expect(result.url).toBe(`http://localhost:3000/join/${result.token}`);
      expect(result.expiresAt!.getTime()).toBeGreaterThan(Date.now());
      expect(mockInvitesRepository.create).not.toHaveBeenCalled();
    });

    it('создаёт постоянную ссылку в базе и не трогает Redis', async () => {
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockInvitesRepository.create.mockResolvedValue({
        id: 'invite-1',
        workspaceId: 'ws-1',
        role: Role.VIEWER,
        createdBy: 'actor-1',
        createdAt: new Date(),
      });

      const result = await service.create(
        'actor-1',
        'ws-1',
        WorkspaceInviteType.PERMANENT,
        Role.VIEWER,
      );

      const expectedHash = createHash('sha256')
        .update(result.token)
        .digest('hex');
      expect(mockInvitesRepository.create).toHaveBeenCalledWith(
        'ws-1',
        'actor-1',
        expectedHash,
        Role.VIEWER,
      );
      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(result.type).toBe(WorkspaceInviteType.PERMANENT);
      expect(result.expiresAt).toBeNull();
    });

    it('по умолчанию выдаёт самую урезанную роль VIEWER', async () => {
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.create(
        'actor-1',
        'ws-1',
        WorkspaceInviteType.TEMPORARY,
      );

      expect(result.role).toBe(Role.VIEWER);
      const [, storedValue] = mockRedis.set.mock.calls[0] as unknown as [
        string,
        string,
      ];
      const parsed = JSON.parse(storedValue) as { role: Role };
      expect(parsed.role).toBe(Role.VIEWER);
    });

    it('обрезает хвостовой слэш FRONT_URL, чтобы не получить //join/', async () => {
      mockConfigService.get.mockImplementation(
        (key: string, defaultValue?: unknown) => {
          if (key === 'INVITE_TTL_SECONDS') return 86400;
          if (key === 'FRONT_URL') return 'https://app.example.com/';
          return defaultValue;
        },
      );
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.create(
        'actor-1',
        'ws-1',
        WorkspaceInviteType.TEMPORARY,
      );

      expect(result.url).toBe(`https://app.example.com/join/${result.token}`);
    });

    it('запрещает ссылку с ролью OWNER', async () => {
      await expect(
        service.create(
          'actor-1',
          'ws-1',
          WorkspaceInviteType.TEMPORARY,
          Role.OWNER,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(mockInvitesRepository.create).not.toHaveBeenCalled();
    });

    it('запрещает ссылку с ролью ADMIN', async () => {
      await expect(
        service.create(
          'actor-1',
          'ws-1',
          WorkspaceInviteType.PERMANENT,
          Role.ADMIN,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockInvitesRepository.create).not.toHaveBeenCalled();
    });

    it('пробрасывает ForbiddenException, если пользователь не владелец/админ', async () => {
      mockWorkspacesService.assertCanManageMembers.mockRejectedValue(
        new ForbiddenException('Only owner or admin can manage members'),
      );

      await expect(
        service.create('actor-1', 'ws-1', WorkspaceInviteType.TEMPORARY),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(mockInvitesRepository.create).not.toHaveBeenCalled();
    });

    it('не даёт превысить лимит постоянных ссылок на воркспейс', async () => {
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockInvitesRepository.countByWorkspaceId.mockResolvedValue(10);

      await expect(
        service.create('actor-1', 'ws-1', WorkspaceInviteType.PERMANENT),
      ).rejects.toThrow(ForbiddenException);
      expect(mockInvitesRepository.create).not.toHaveBeenCalled();
    });

    it('лимит постоянных ссылок не мешает временным', async () => {
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockInvitesRepository.countByWorkspaceId.mockResolvedValue(10);
      mockRedis.set.mockResolvedValue('OK');

      await expect(
        service.create('actor-1', 'ws-1', WorkspaceInviteType.TEMPORARY),
      ).resolves.toBeDefined();
    });
  });

  describe('list / revoke', () => {
    it('отдаёт постоянные ссылки владельцу и админу', async () => {
      const invites = [
        {
          id: 'invite-1',
          workspaceId: 'ws-1',
          role: Role.EDITOR,
          createdBy: 'actor-1',
          createdAt: new Date(),
        },
      ];
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockInvitesRepository.findAllByWorkspaceId.mockResolvedValue(invites);

      await expect(service.list('actor-1', 'ws-1')).resolves.toBe(invites);
      expect(mockWorkspacesService.assertCanManageMembers).toHaveBeenCalledWith(
        'ws-1',
        'actor-1',
      );
    });

    it('не отдаёт список тому, кто не управляет участниками', async () => {
      mockWorkspacesService.assertCanManageMembers.mockRejectedValue(
        new ForbiddenException('Only owner or admin can manage members'),
      );

      await expect(service.list('actor-1', 'ws-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockInvitesRepository.findAllByWorkspaceId).not.toHaveBeenCalled();
    });

    it('отзывает утёкшую постоянную ссылку', async () => {
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockInvitesRepository.deleteById.mockResolvedValue(true);

      await expect(
        service.revoke('actor-1', 'ws-1', 'invite-1'),
      ).resolves.toBeUndefined();
      expect(mockInvitesRepository.deleteById).toHaveBeenCalledWith(
        'ws-1',
        'invite-1',
      );
    });

    it('бросает NotFoundException, если отзывать нечего', async () => {
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockInvitesRepository.deleteById.mockResolvedValue(false);

      await expect(
        service.revoke('actor-1', 'ws-1', 'invite-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('redeem', () => {
    const member = {
      id: 'member-1',
      workspaceId: 'ws-1',
      userId: 'user-2',
      role: Role.EDITOR,
      createdAt: new Date(),
    };

    const storedInviteJson = JSON.stringify({
      workspaceId: 'ws-1',
      role: Role.EDITOR,
      createdBy: 'actor-1',
    });

    it('добавляет пользователя по временной ссылке, атомарно потребляя её из Redis', async () => {
      const token = randomBytes(32).toString('base64url');
      const hash = createHash('sha256').update(token).digest('hex');
      mockRedis.ttl.mockResolvedValue(12345);
      mockRedis.getdel.mockResolvedValue(storedInviteJson);
      mockWorkspacesService.addMemberViaInvite.mockResolvedValue(member);

      const result = await service.redeem('user-2', token);

      expect(mockRedis.getdel).toHaveBeenCalledWith(`workspace_invite:${hash}`);
      expect(mockWorkspacesService.addMemberViaInvite).toHaveBeenCalledWith(
        'ws-1',
        'user-2',
        Role.EDITOR,
      );
      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(result.workspaceId).toBe('ws-1');
      expect(result.userId).toBe('user-2');
    });

    it('временная ссылка одноразовая: второй вызов получает NotFoundException', async () => {
      const token = randomBytes(32).toString('base64url');
      mockWorkspacesService.addMemberViaInvite.mockResolvedValue(member);
      mockRedis.ttl.mockResolvedValueOnce(12345);
      mockRedis.getdel.mockResolvedValueOnce(storedInviteJson);
      await service.redeem('user-2', token);

      mockRedis.ttl.mockResolvedValueOnce(-2);
      mockRedis.getdel.mockResolvedValueOnce(null);
      mockInvitesRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.redeem('user-3', token)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockWorkspacesService.addMemberViaInvite).toHaveBeenCalledTimes(1);
    });

    it('находит постоянную ссылку в базе и не трогает Redis после использования', async () => {
      const token = randomBytes(32).toString('base64url');
      const hash = createHash('sha256').update(token).digest('hex');
      mockRedis.ttl.mockResolvedValue(-2);
      mockRedis.getdel.mockResolvedValue(null);
      mockInvitesRepository.findByTokenHash.mockResolvedValue({
        id: 'invite-1',
        workspaceId: 'ws-1',
        role: Role.VIEWER,
        createdBy: 'actor-1',
        createdAt: new Date(),
      });
      mockWorkspacesService.addMemberViaInvite.mockResolvedValue({
        ...member,
        role: Role.VIEWER,
      });

      const result = await service.redeem('user-2', token);

      expect(mockInvitesRepository.findByTokenHash).toHaveBeenCalledWith(hash);
      expect(result.role).toBe(Role.VIEWER);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('бросает NotFoundException, если ссылка не найдена нигде', async () => {
      mockRedis.ttl.mockResolvedValue(-2);
      mockRedis.getdel.mockResolvedValue(null);
      mockInvitesRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.redeem('user-2', 'bad-token')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockWorkspacesService.addMemberViaInvite).not.toHaveBeenCalled();
    });

    it('возвращает ссылку в Redis, если воркспейс удалён (компенсация)', async () => {
      const token = randomBytes(32).toString('base64url');
      mockRedis.ttl.mockResolvedValue(12345);
      mockRedis.getdel.mockResolvedValue(
        JSON.stringify({
          workspaceId: 'ws-deleted',
          role: Role.EDITOR,
          createdBy: 'actor-1',
        }),
      );
      mockWorkspacesService.addMemberViaInvite.mockRejectedValue(
        new NotFoundException('Workspace not found'),
      );

      await expect(service.redeem('user-2', token)).rejects.toThrow(
        NotFoundException,
      );
      const [, value, ex, ttl] = mockRedis.set.mock.calls[0] as unknown as [
        string,
        string,
        string,
        number,
      ];
      expect(ex).toBe('EX');
      expect(ttl).toBe(12345);
      const restored = JSON.parse(value) as { workspaceId: string };
      expect(restored.workspaceId).toBe('ws-deleted');
    });

    it('возвращает ссылку в Redis и бросает ConflictException, если пользователь уже участник', async () => {
      mockRedis.ttl.mockResolvedValue(12345);
      mockRedis.getdel.mockResolvedValue(storedInviteJson);
      mockWorkspacesService.addMemberViaInvite.mockRejectedValue(
        new ConflictException('User is already a member of this workspace'),
      );

      await expect(service.redeem('user-2', 'any-token')).rejects.toThrow(
        ConflictException,
      );
      expect(mockRedis.set).toHaveBeenCalledTimes(1);
    });

    it('сбой компенсации не подменяет исходную ошибку клиента', async () => {
      mockRedis.ttl.mockResolvedValue(12345);
      mockRedis.getdel.mockResolvedValue(storedInviteJson);
      mockWorkspacesService.addMemberViaInvite.mockRejectedValue(
        new ConflictException('User is already a member of this workspace'),
      );
      mockRedis.set.mockRejectedValue(new Error('READONLY: replica is down'));

      await expect(service.redeem('user-2', 'any-token')).rejects.toThrow(
        ConflictException,
      );
    });

    it('битое значение в Redis даёт 404, а не 500', async () => {
      mockRedis.ttl.mockResolvedValue(12345);
      mockRedis.getdel.mockResolvedValue('{not json');
      mockInvitesRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.redeem('user-2', 'any-token')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockWorkspacesService.addMemberViaInvite).not.toHaveBeenCalled();
    });

    it('приглашение без роли не превращается молча в EDITOR', async () => {
      mockRedis.ttl.mockResolvedValue(12345);
      mockRedis.getdel.mockResolvedValue(
        JSON.stringify({ workspaceId: 'ws-1', createdBy: 'actor-1' }),
      );
      mockInvitesRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.redeem('user-2', 'any-token')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockWorkspacesService.addMemberViaInvite).not.toHaveBeenCalled();
    });

    it('приглашение с ролью OWNER в Redis не принимается', async () => {
      mockRedis.ttl.mockResolvedValue(12345);
      mockRedis.getdel.mockResolvedValue(
        JSON.stringify({
          workspaceId: 'ws-1',
          role: Role.OWNER,
          createdBy: 'actor-1',
        }),
      );
      mockInvitesRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.redeem('user-2', 'any-token')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockWorkspacesService.addMemberViaInvite).not.toHaveBeenCalled();
    });

    it('недоступность Redis не ломает погашение постоянных ссылок', async () => {
      const token = randomBytes(32).toString('base64url');
      mockRedis.ttl.mockRejectedValue(new Error('ECONNREFUSED'));
      mockInvitesRepository.findByTokenHash.mockResolvedValue({
        id: 'invite-1',
        workspaceId: 'ws-1',
        role: Role.VIEWER,
        createdBy: 'actor-1',
        createdAt: new Date(),
      });
      mockWorkspacesService.addMemberViaInvite.mockResolvedValue({
        ...member,
        role: Role.VIEWER,
      });

      const result = await service.redeem('user-2', token);

      expect(result.role).toBe(Role.VIEWER);
    });
  });
});
