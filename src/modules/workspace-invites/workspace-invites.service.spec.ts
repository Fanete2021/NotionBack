import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { createHash } from 'crypto';
import { WorkspaceInvitesService } from './workspace-invites.service';
import { WorkspaceInvitesRepository } from './workspace-invites.repository';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { RedisClient } from '../../common/providers';
import { TemporaryInviteStore } from './temporary-invite.store';
import { WorkspaceInviteType } from './types';

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
});
