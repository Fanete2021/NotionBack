import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { WorkspaceInvitesService } from '@modules/workspace-invites/workspace-invites.service';
import { WorkspaceInvitesRepository } from '@modules/workspace-invites/workspace-invites.repository';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { RedisClient } from '@common/providers';
import { TemporaryInviteStore } from '@modules/workspace-invites/temporary-invite.store';
import { WorkspaceInviteType } from '@modules/workspace-invites/types';

describe('WorkspaceInvitesService', () => {
  let service: WorkspaceInvitesService;

  const mockInvitesRepository = {
    create: jest.fn(),
    findAllByWorkspaceId: jest.fn(),
    countByWorkspaceId: jest.fn(),
    deleteById: jest.fn(),
  };
  const mockWorkspacesService = {
    assertCanManageMembers: jest.fn(),
  };
  const mockRedisMulti = {
    set: jest.fn(),
    sadd: jest.fn(),
    expire: jest.fn(),
    exec: jest.fn(),
  };
  const mockRedis = {
    multi: jest.fn(() => mockRedisMulti),
    set: jest.fn(),
    ttl: jest.fn(),
    getdel: jest.fn(),
    get: jest.fn(),
    smembers: jest.fn(),
    srem: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockRedis.multi.mockReturnValue(mockRedisMulti);
    mockRedisMulti.set.mockReturnValue(mockRedisMulti);
    mockRedisMulti.sadd.mockReturnValue(mockRedisMulti);
    mockRedisMulti.expire.mockReturnValue(mockRedisMulti);
    mockRedisMulti.exec.mockResolvedValue([]);
    mockRedis.smembers.mockResolvedValue([]);
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
        TemporaryInviteStore,
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
      expect(mockRedisMulti.set).toHaveBeenCalledTimes(1);

      const setCall = mockRedisMulti.set.mock.calls[0] as unknown as [
        string,
        string,
        string,
        number,
      ];
      const [key, value, ex, ttl] = setCall;
      expect(key).toBe(`workspace_invite:${result.token}`);
      const stored = JSON.parse(value) as Record<string, unknown>;
      expect(stored).toMatchObject({
        workspaceId: 'ws-1',
        role: Role.EDITOR,
        createdBy: 'actor-1',
      });
      expect(typeof stored.createdAt).toBe('string');
      expect(ex).toBe('EX');
      expect(ttl).toBe(86400);

      const saddCall = mockRedisMulti.sadd.mock.calls[0] as unknown as [
        string,
        string,
      ];
      expect(saddCall).toEqual(['workspace_invite_index:ws-1', result.token]);

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

      expect(mockInvitesRepository.create).toHaveBeenCalledWith(
        'ws-1',
        'actor-1',
        result.token,
        Role.VIEWER,
      );
      expect(mockRedis.multi).not.toHaveBeenCalled();
      expect(result.type).toBe(WorkspaceInviteType.PERMANENT);
      expect(result.expiresAt).toBeNull();
    });

    it('по умолчанию выдаёт самую урезанную роль VIEWER', async () => {
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);

      const result = await service.create(
        'actor-1',
        'ws-1',
        WorkspaceInviteType.TEMPORARY,
      );

      expect(result.role).toBe(Role.VIEWER);
      const [, storedValue] = mockRedisMulti.set.mock.calls[0] as unknown as [
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
    it('отдаёт постоянные ссылки с токеном и url владельцу и админу', async () => {
      const createdAt = new Date();
      const invites = [
        {
          id: 'invite-1',
          workspaceId: 'ws-1',
          token: 'perm-token',
          role: Role.EDITOR,
          createdBy: 'actor-1',
          createdAt,
        },
      ];
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockInvitesRepository.findAllByWorkspaceId.mockResolvedValue(invites);
      mockRedis.smembers.mockResolvedValue([]);

      const result = await service.list('actor-1', 'ws-1');

      expect(result).toEqual([
        {
          id: 'invite-1',
          workspaceId: 'ws-1',
          type: WorkspaceInviteType.PERMANENT,
          role: Role.EDITOR,
          createdBy: 'actor-1',
          createdAt,
          token: 'perm-token',
          expiresAt: null,
        },
      ]);
      expect(mockWorkspacesService.assertCanManageMembers).toHaveBeenCalledWith(
        'ws-1',
        'actor-1',
      );
    });

    it('добавляет в список активные временные ссылки из Redis', async () => {
      const createdAt = new Date();
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockInvitesRepository.findAllByWorkspaceId.mockResolvedValue([]);
      mockRedis.smembers.mockResolvedValue(['temp-token']);
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          workspaceId: 'ws-1',
          role: Role.VIEWER,
          createdBy: 'actor-1',
          createdAt: createdAt.toISOString(),
        }),
      );
      mockRedis.ttl.mockResolvedValue(3600);

      const result = await service.list('actor-1', 'ws-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'temp-token',
        workspaceId: 'ws-1',
        type: WorkspaceInviteType.TEMPORARY,
        role: Role.VIEWER,
        token: 'temp-token',
      });
      expect(result[0].expiresAt).toBeInstanceOf(Date);
    });

    it('чистит индекс от протухших временных ссылок', async () => {
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockInvitesRepository.findAllByWorkspaceId.mockResolvedValue([]);
      mockRedis.smembers.mockResolvedValue(['stale-token']);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.ttl.mockResolvedValue(-2);

      const result = await service.list('actor-1', 'ws-1');

      expect(result).toHaveLength(0);
      expect(mockRedis.srem).toHaveBeenCalledWith(
        'workspace_invite_index:ws-1',
        'stale-token',
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
});
