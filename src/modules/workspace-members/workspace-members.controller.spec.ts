import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { WorkspaceMembersController } from '@modules/workspace-members/workspace-members.controller';
import { WorkspaceMembersService } from '@modules/workspace-members/workspace-members.service';
import { WorkspaceMemberGuard } from '@modules/workspace-members/guards';

describe('WorkspaceMembersController', () => {
  let controller: WorkspaceMembersController;

  const mockWorkspaceMembersService = {
    listMembers: jest.fn(),
    addMember: jest.fn(),
    changeMemberRole: jest.fn(),
    removeMember: jest.fn(),
  };

  const member = {
    id: 'mem-1',
    workspaceId: 'ws-1',
    userId: 'user-2',
    role: Role.EDITOR,
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspaceMembersController],
      providers: [
        {
          provide: WorkspaceMembersService,
          useValue: mockWorkspaceMembersService,
        },
      ],
    })
      .overrideGuard(WorkspaceMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(WorkspaceMembersController);
  });

  it('listMembers делегирует в сервис', async () => {
    mockWorkspaceMembersService.listMembers.mockResolvedValue([member]);

    await expect(controller.listMembers('ws-1')).resolves.toEqual([member]);
    expect(mockWorkspaceMembersService.listMembers).toHaveBeenCalledWith(
      'ws-1',
    );
  });

  it('addMember делегирует в сервис', async () => {
    mockWorkspaceMembersService.addMember.mockResolvedValue(member);

    await expect(
      controller.addMember('user-1', 'ws-1', {
        userId: 'user-2',
        role: Role.EDITOR,
      }),
    ).resolves.toBe(member);
    expect(mockWorkspaceMembersService.addMember).toHaveBeenCalledWith(
      'user-1',
      'ws-1',
      'user-2',
      Role.EDITOR,
    );
  });

  it('changeMemberRole делегирует в сервис', async () => {
    mockWorkspaceMembersService.changeMemberRole.mockResolvedValue({
      ...member,
      role: Role.ADMIN,
    });

    await expect(
      controller.changeMemberRole('user-1', 'ws-1', 'user-2', {
        role: Role.ADMIN,
      }),
    ).resolves.toEqual({ ...member, role: Role.ADMIN });
    expect(mockWorkspaceMembersService.changeMemberRole).toHaveBeenCalledWith(
      'user-1',
      'ws-1',
      'user-2',
      Role.ADMIN,
    );
  });

  it('removeMember делегирует в сервис', async () => {
    mockWorkspaceMembersService.removeMember.mockResolvedValue(undefined);

    await expect(
      controller.removeMember('user-1', 'ws-1', 'user-2'),
    ).resolves.toBeUndefined();
    expect(mockWorkspaceMembersService.removeMember).toHaveBeenCalledWith(
      'user-1',
      'ws-1',
      'user-2',
    );
  });
});
