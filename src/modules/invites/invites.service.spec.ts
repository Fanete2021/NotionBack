import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { InvitesService } from './invites.service';
import { InvitesRepository } from './invites.repository';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { RedisClient } from '../../common/providers/redis-client';
import { InviteType } from './types/invite.types';

describe('InvitesService', () => {
  let service: InvitesService;

  const mockInvitesRepository = {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    addMember: jest.fn(),
  };
  const mockWorkspacesService = {
    assertCanManageMembers: jest.fn(),
    findById: jest.fn(),
  };
  const mockRedis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
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
        return defaultValue;
      },
    );

    const module = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: InvitesRepository, useValue: mockInvitesRepository },
        { provide: WorkspacesService, useValue: mockWorkspacesService },
        { provide: RedisClient, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<InvitesService>(InvitesService);
  });

  describe('create', () => {
    it('создаёт временную ссылку в Redis с TTL', async () => {
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.create(
        'actor-1',
        'ws-1',
        InviteType.TEMPORARY,
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

      expect(result.type).toBe(InviteType.TEMPORARY);
      expect(result.role).toBe(Role.EDITOR);
      expect(result.url).toBe(`http://localhost:3000/join/${result.token}`);
      expect(result.expiresAt!.getTime()).toBeGreaterThan(Date.now());
      expect(mockInvitesRepository.create).not.toHaveBeenCalled();
    });

    it('создаёт постоянную ссылку в базе и не трогает Redis', async () => {
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockInvitesRepository.create.mockResolvedValue({
        id: 'invite-1',
        tokenHash: 'stored-hash',
        workspaceId: 'ws-1',
        createdBy: 'actor-1',
        role: Role.VIEWER,
        createdAt: new Date(),
      });

      const result = await service.create(
        'actor-1',
        'ws-1',
        InviteType.PERMANENT,
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
      expect(result.type).toBe(InviteType.PERMANENT);
      expect(result.expiresAt).toBeNull();
    });

    it('по умолчанию выдаёт роль EDITOR', async () => {
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.create(
        'actor-1',
        'ws-1',
        InviteType.TEMPORARY,
      );

      expect(result.role).toBe(Role.EDITOR);
      const [, storedValue] = mockRedis.set.mock.calls[0] as unknown as [
        string,
        string,
      ];
      const parsed = JSON.parse(storedValue) as { role: Role };
      expect(parsed.role).toBe(Role.EDITOR);
    });

    it('запрещает ссылку с ролью OWNER', async () => {
      await expect(
        service.create('actor-1', 'ws-1', InviteType.TEMPORARY, Role.OWNER),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(mockInvitesRepository.create).not.toHaveBeenCalled();
    });

    it('запрещает ссылку с ролью ADMIN', async () => {
      await expect(
        service.create('actor-1', 'ws-1', InviteType.PERMANENT, Role.ADMIN),
      ).rejects.toThrow(ForbiddenException);
      expect(mockInvitesRepository.create).not.toHaveBeenCalled();
    });

    it('пробрасывает ForbiddenException, если пользователь не владелец/админ', async () => {
      mockWorkspacesService.assertCanManageMembers.mockRejectedValue(
        new ForbiddenException('Only owner or admin can manage members'),
      );

      await expect(
        service.create('actor-1', 'ws-1', InviteType.TEMPORARY),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(mockInvitesRepository.create).not.toHaveBeenCalled();
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

    it('добавляет пользователя по временной ссылке и удаляет её из Redis (одноразовая)', async () => {
      const token = randomBytes(32).toString('base64url');
      const hash = createHash('sha256').update(token).digest('hex');
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          workspaceId: 'ws-1',
          role: Role.EDITOR,
          createdBy: 'actor-1',
        }),
      );
      mockWorkspacesService.findById.mockResolvedValue({ id: 'ws-1' });
      mockInvitesRepository.addMember.mockResolvedValue(member);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.redeem('user-2', token);

      expect(mockRedis.get).toHaveBeenCalledWith(`workspace_invite:${hash}`);
      expect(mockInvitesRepository.addMember).toHaveBeenCalledWith(
        'ws-1',
        'user-2',
        Role.EDITOR,
      );
      expect(mockRedis.del).toHaveBeenCalledWith(`workspace_invite:${hash}`);
      expect(result.workspaceId).toBe('ws-1');
      expect(result.userId).toBe('user-2');
    });

    it('находит постоянную ссылку в базе и не удаляет её после использования', async () => {
      const token = randomBytes(32).toString('base64url');
      const hash = createHash('sha256').update(token).digest('hex');
      mockRedis.get.mockResolvedValue(null);
      mockInvitesRepository.findByTokenHash.mockResolvedValue({
        id: 'invite-1',
        tokenHash: hash,
        workspaceId: 'ws-1',
        createdBy: 'actor-1',
        role: Role.VIEWER,
        createdAt: new Date(),
      });
      mockWorkspacesService.findById.mockResolvedValue({ id: 'ws-1' });
      mockInvitesRepository.addMember.mockResolvedValue({
        ...member,
        role: Role.VIEWER,
      });

      const result = await service.redeem('user-2', token);

      expect(mockInvitesRepository.findByTokenHash).toHaveBeenCalledWith(hash);
      expect(result.role).toBe(Role.VIEWER);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('бросает NotFoundException, если ссылка не найдена нигде', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockInvitesRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.redeem('user-2', 'bad-token')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockInvitesRepository.addMember).not.toHaveBeenCalled();
    });

    it('бросает NotFoundException, если воркспейс ссылки удалён', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          workspaceId: 'ws-deleted',
          role: Role.EDITOR,
          createdBy: 'actor-1',
        }),
      );
      mockWorkspacesService.findById.mockRejectedValue(
        new NotFoundException('Workspace not found'),
      );

      await expect(service.redeem('user-2', 'any-token')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockInvitesRepository.addMember).not.toHaveBeenCalled();
    });

    it('бросает ConflictException, если пользователь уже участник', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          workspaceId: 'ws-1',
          role: Role.EDITOR,
          createdBy: 'actor-1',
        }),
      );
      mockWorkspacesService.findById.mockResolvedValue({ id: 'ws-1' });
      mockInvitesRepository.addMember.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.redeem('user-2', 'any-token')).rejects.toThrow(
        ConflictException,
      );
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });
});
