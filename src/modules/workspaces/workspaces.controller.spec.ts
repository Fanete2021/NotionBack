import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspacesService } from './workspaces.service';
import { Role } from '@prisma/client';

describe('WorkspacesController', () => {
  let controller: WorkspacesController;
  let membersController: WorkspaceMembersController;

  const mockWorkspacesService = {
    create: jest.fn(),
    findAllByUserId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    listMembers: jest.fn(),
    addMember: jest.fn(),
    changeMemberRole: jest.fn(),
    removeMember: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspacesController, WorkspaceMembersController],
      providers: [
        { provide: WorkspacesService, useValue: mockWorkspacesService },
      ],
    }).compile();

    controller = module.get<WorkspacesController>(WorkspacesController);
    membersController = module.get<WorkspaceMembersController>(
      WorkspaceMembersController,
    );
  });

  it('create: делегирует в сервис', async () => {
    mockWorkspacesService.create.mockResolvedValue({ id: 'ws-1' });

    const result = await controller.create('user-1', { name: 'My space' });

    expect(mockWorkspacesService.create).toHaveBeenCalledWith(
      'user-1',
      'My space',
    );
    expect(result).toEqual({ id: 'ws-1' });
  });

  it('findAllByUserId: делегирует в сервис', async () => {
    mockWorkspacesService.findAllByUserId.mockResolvedValue([{ id: 'ws-1' }]);

    await expect(controller.findAllByUserId('user-1')).resolves.toEqual([
      { id: 'ws-1' },
    ]);
    expect(mockWorkspacesService.findAllByUserId).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('findById: передаёт userId и workspaceId', async () => {
    mockWorkspacesService.findById.mockResolvedValue({ id: 'ws-1' });

    await expect(controller.findById('user-1', 'ws-1')).resolves.toEqual({
      id: 'ws-1',
    });
    expect(mockWorkspacesService.findById).toHaveBeenCalledWith(
      'user-1',
      'ws-1',
    );
  });

  it('update: передаёт userId, workspaceId и dto', async () => {
    mockWorkspacesService.update.mockResolvedValue({ id: 'ws-1' });
    const dto = { name: 'Renamed' };

    await expect(controller.update('user-1', 'ws-1', dto)).resolves.toEqual({
      id: 'ws-1',
    });
    expect(mockWorkspacesService.update).toHaveBeenCalledWith(
      'user-1',
      'ws-1',
      dto,
    );
  });

  it('delete: делегирует в сервис', async () => {
    mockWorkspacesService.delete.mockResolvedValue(undefined);

    await expect(controller.delete('user-1', 'ws-1')).resolves.toBeUndefined();
    expect(mockWorkspacesService.delete).toHaveBeenCalledWith('user-1', 'ws-1');
  });

  describe('WorkspaceMembersController', () => {
    it('listMembers: передаёт userId и workspaceId', async () => {
      mockWorkspacesService.listMembers.mockResolvedValue([
        { workspaceId: 'ws-1', userId: 'user-2' },
      ]);

      await expect(
        membersController.listMembers('user-1', 'ws-1'),
      ).resolves.toHaveLength(1);
      expect(mockWorkspacesService.listMembers).toHaveBeenCalledWith(
        'user-1',
        'ws-1',
      );
    });

    it('addMember: передаёт role из dto', async () => {
      mockWorkspacesService.addMember.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: Role.EDITOR,
      });

      await membersController.addMember('user-1', 'ws-1', {
        userId: 'user-2',
        role: Role.EDITOR,
      });

      expect(mockWorkspacesService.addMember).toHaveBeenCalledWith(
        'user-1',
        'ws-1',
        'user-2',
        Role.EDITOR,
      );
    });

    it('changeMemberRole: передаёт параметры', async () => {
      mockWorkspacesService.changeMemberRole.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: Role.ADMIN,
      });

      await membersController.changeMemberRole('user-1', 'ws-1', 'user-2', {
        role: Role.ADMIN,
      });

      expect(mockWorkspacesService.changeMemberRole).toHaveBeenCalledWith(
        'user-1',
        'ws-1',
        'user-2',
        Role.ADMIN,
      );
    });

    it('removeMember: делегирует в сервис', async () => {
      mockWorkspacesService.removeMember.mockResolvedValue(undefined);

      await expect(
        membersController.removeMember('user-1', 'ws-1', 'user-2'),
      ).resolves.toBeUndefined();
      expect(mockWorkspacesService.removeMember).toHaveBeenCalledWith(
        'user-1',
        'ws-1',
        'user-2',
      );
    });
  });
});
