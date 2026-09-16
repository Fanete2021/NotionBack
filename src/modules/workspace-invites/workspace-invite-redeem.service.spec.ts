import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { WorkspaceInviteRedeemService } from '@modules/workspace-invites/workspace-invite-redeem.service';
import { WorkspaceInvitesRepository } from '@modules/workspace-invites/workspace-invites.repository';
import { WorkspaceMembersService } from '@modules/workspace-members/workspace-members.service';
import {
  WorkspaceMemberEntity,
  WorkspaceMemberUserEntity,
} from '@modules/workspace-members/entities';
import { RedisClient } from '@common/providers';
import { TemporaryInviteStore } from '@modules/workspace-invites/temporary-invite.store';

describe('WorkspaceInviteRedeemService', () => {
  let service: WorkspaceInviteRedeemService;

  const mockInvitesRepository = {
    findByToken: jest.fn(),
  };
  const mockWorkspaceMembersService = {
    addMemberViaInvite: jest.fn(),
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
    srem: jest.fn(),
  };

  const member = new WorkspaceMemberEntity(
    'member-1',
    Role.EDITOR,
    new Date(),
    new WorkspaceMemberUserEntity({
      id: 'user-2',
      name: 'User Two',
      email: 'user2@example.com',
    }),
  );

  const storedInviteJson = JSON.stringify({
    workspaceId: 'ws-1',
    role: Role.EDITOR,
    createdBy: 'actor-1',
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    mockRedis.multi.mockReturnValue(mockRedisMulti);
    mockRedisMulti.set.mockReturnValue(mockRedisMulti);
    mockRedisMulti.sadd.mockReturnValue(mockRedisMulti);
    mockRedisMulti.expire.mockReturnValue(mockRedisMulti);
    mockRedisMulti.exec.mockResolvedValue([]);

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
    mockRedis.ttl.mockResolvedValue(12345);
    mockRedis.getdel.mockResolvedValue(storedInviteJson);
    mockWorkspaceMembersService.addMemberViaInvite.mockResolvedValue(member);

    const result = await service.redeem('user-2', token);

    expect(mockRedis.getdel).toHaveBeenCalledWith(`workspace_invite:${token}`);
    expect(mockWorkspaceMembersService.addMemberViaInvite).toHaveBeenCalledWith(
      'ws-1',
      'user-2',
      Role.EDITOR,
    );
    expect(mockRedis.set).not.toHaveBeenCalled();
    expect(result.id).toBe('member-1');
    expect(result.role).toBe(Role.EDITOR);
    expect(result.userInfo?.id).toBe('user-2');
  });

  it('временная ссылка одноразовая: второй вызов получает NotFoundException', async () => {
    const token = randomBytes(32).toString('base64url');
    mockWorkspaceMembersService.addMemberViaInvite.mockResolvedValue(member);
    mockRedis.ttl.mockResolvedValueOnce(12345);
    mockRedis.getdel.mockResolvedValueOnce(storedInviteJson);
    await service.redeem('user-2', token);

    mockRedis.ttl.mockResolvedValueOnce(-2);
    mockRedis.getdel.mockResolvedValueOnce(null);
    mockInvitesRepository.findByToken.mockResolvedValue(null);

    await expect(service.redeem('user-3', token)).rejects.toThrow(
      NotFoundException,
    );
    expect(
      mockWorkspaceMembersService.addMemberViaInvite,
    ).toHaveBeenCalledTimes(1);
  });

  it('находит постоянную ссылку в базе и не трогает Redis после использования', async () => {
    const token = randomBytes(32).toString('base64url');
    mockRedis.ttl.mockResolvedValue(-2);
    mockRedis.getdel.mockResolvedValue(null);
    mockInvitesRepository.findByToken.mockResolvedValue({
      id: 'invite-1',
      workspaceId: 'ws-1',
      role: Role.VIEWER,
      createdBy: 'actor-1',
      createdAt: new Date(),
    });
    mockWorkspaceMembersService.addMemberViaInvite.mockResolvedValue(
      new WorkspaceMemberEntity(
        'member-1',
        Role.VIEWER,
        member.createdAt,
        member.userInfo,
      ),
    );

    const result = await service.redeem('user-2', token);

    expect(mockInvitesRepository.findByToken).toHaveBeenCalledWith(token);
    expect(result.role).toBe(Role.VIEWER);
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('бросает NotFoundException, если ссылка не найдена нигде', async () => {
    mockRedis.ttl.mockResolvedValue(-2);
    mockRedis.getdel.mockResolvedValue(null);
    mockInvitesRepository.findByToken.mockResolvedValue(null);

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
    const [, value, ex, ttl] = mockRedisMulti.set.mock.calls[0] as unknown as [
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
    expect(mockRedisMulti.set).toHaveBeenCalledTimes(1);
  });

  it('сбой компенсации не подменяет исходную ошибку клиента', async () => {
    mockRedis.ttl.mockResolvedValue(12345);
    mockRedis.getdel.mockResolvedValue(storedInviteJson);
    mockWorkspaceMembersService.addMemberViaInvite.mockRejectedValue(
      new ConflictException('User is already a member of this workspace'),
    );
    mockRedisMulti.exec.mockRejectedValue(
      new Error('READONLY: replica is down'),
    );

    await expect(service.redeem('user-2', 'any-token')).rejects.toThrow(
      ConflictException,
    );
  });

  it('битое значение в Redis даёт 404, а не 500', async () => {
    mockRedis.ttl.mockResolvedValue(12345);
    mockRedis.getdel.mockResolvedValue('{not json');
    mockInvitesRepository.findByToken.mockResolvedValue(null);

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
    mockInvitesRepository.findByToken.mockResolvedValue(null);

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
    mockInvitesRepository.findByToken.mockResolvedValue(null);

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
    mockInvitesRepository.findByToken.mockResolvedValue({
      id: 'invite-1',
      workspaceId: 'ws-1',
      role: Role.VIEWER,
      createdBy: 'actor-1',
      createdAt: new Date(),
    });
    mockWorkspaceMembersService.addMemberViaInvite.mockResolvedValue(
      new WorkspaceMemberEntity(
        'member-1',
        Role.VIEWER,
        member.createdAt,
        member.userInfo,
      ),
    );

    const result = await service.redeem('user-2', token);

    expect(result.role).toBe(Role.VIEWER);
  });
});
