import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { WorkspaceInviteRedeemService } from '@modules/workspace-invites/workspace-invite-redeem.service';
import { WorkspaceInvitesRepository } from '@modules/workspace-invites/workspace-invites.repository';
import { WorkspaceMembersService } from '@modules/workspaces/workspace-members.service';
import { RedisClient } from '@common/providers';
import { TemporaryInviteStore } from '@modules/workspace-invites/temporary-invite.store';

describe('WorkspaceInviteRedeemService', () => {
  let service: WorkspaceInviteRedeemService;

  const mockInvitesRepository = {
    findByTokenHash: jest.fn(),
  };
  const mockWorkspaceMembersService = {
    addMemberViaInvite: jest.fn(),
  };
  const mockRedis = {
    set: jest.fn(),
    ttl: jest.fn(),
    getdel: jest.fn(),
  };

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

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        WorkspaceInviteRedeemService,
        TemporaryInviteStore,
        {
          provide: WorkspaceInvitesRepository,
          useValue: mockInvitesRepository,
        },
        {
          provide: WorkspaceMembersService,
          useValue: mockWorkspaceMembersService,
        },
        { provide: RedisClient, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<WorkspaceInviteRedeemService>(
      WorkspaceInviteRedeemService,
    );
  });

  it('добавляет пользователя по временной ссылке, атомарно потребляя её из Redis', async () => {
    const token = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(token).digest('hex');
    mockRedis.ttl.mockResolvedValue(12345);
    mockRedis.getdel.mockResolvedValue(storedInviteJson);
    mockWorkspaceMembersService.addMemberViaInvite.mockResolvedValue(member);

    const result = await service.redeem('user-2', token);

    expect(mockRedis.getdel).toHaveBeenCalledWith(`workspace_invite:${hash}`);
    expect(mockWorkspaceMembersService.addMemberViaInvite).toHaveBeenCalledWith(
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
    mockWorkspaceMembersService.addMemberViaInvite.mockResolvedValue(member);
    mockRedis.ttl.mockResolvedValueOnce(12345);
    mockRedis.getdel.mockResolvedValueOnce(storedInviteJson);
    await service.redeem('user-2', token);

    mockRedis.ttl.mockResolvedValueOnce(-2);
    mockRedis.getdel.mockResolvedValueOnce(null);
    mockInvitesRepository.findByTokenHash.mockResolvedValue(null);

    await expect(service.redeem('user-3', token)).rejects.toThrow(
      NotFoundException,
    );
    expect(
      mockWorkspaceMembersService.addMemberViaInvite,
    ).toHaveBeenCalledTimes(1);
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
    mockWorkspaceMembersService.addMemberViaInvite.mockResolvedValue({
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
    expect(
      mockWorkspaceMembersService.addMemberViaInvite,
    ).not.toHaveBeenCalled();
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
    mockWorkspaceMembersService.addMemberViaInvite.mockRejectedValue(
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
    mockWorkspaceMembersService.addMemberViaInvite.mockRejectedValue(
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
    mockWorkspaceMembersService.addMemberViaInvite.mockRejectedValue(
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
    expect(
      mockWorkspaceMembersService.addMemberViaInvite,
    ).not.toHaveBeenCalled();
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
    expect(
      mockWorkspaceMembersService.addMemberViaInvite,
    ).not.toHaveBeenCalled();
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
    expect(
      mockWorkspaceMembersService.addMemberViaInvite,
    ).not.toHaveBeenCalled();
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
    mockWorkspaceMembersService.addMemberViaInvite.mockResolvedValue({
      ...member,
      role: Role.VIEWER,
    });

    const result = await service.redeem('user-2', token);

    expect(result.role).toBe(Role.VIEWER);
  });
});
