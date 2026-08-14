import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { WorkspaceProjectsController } from './workspace-projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let workspaceController: WorkspaceProjectsController;

  const mockProjectsService = {
    create: jest.fn(),
    findAllByWorkspaceId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    reorder: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController, WorkspaceProjectsController],
      providers: [{ provide: ProjectsService, useValue: mockProjectsService }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    workspaceController = module.get<WorkspaceProjectsController>(
      WorkspaceProjectsController,
    );
  });

  it('findById: передаёт userId и id', async () => {
    mockProjectsService.findById.mockResolvedValue({ id: 'p1' });

    await expect(controller.findById('user-1', 'p1')).resolves.toEqual({
      id: 'p1',
    });
    expect(mockProjectsService.findById).toHaveBeenCalledWith('user-1', 'p1');
  });

  it('update: передаёт userId, id и dto', async () => {
    mockProjectsService.update.mockResolvedValue({ id: 'p1' });
    const dto = { name: 'New' };

    await expect(controller.update('user-1', 'p1', dto)).resolves.toEqual({
      id: 'p1',
    });
    expect(mockProjectsService.update).toHaveBeenCalledWith(
      'user-1',
      'p1',
      dto,
    );
  });

  it('delete: делегирует в сервис', async () => {
    mockProjectsService.delete.mockResolvedValue(undefined);

    await expect(controller.delete('user-1', 'p1')).resolves.toBeUndefined();
    expect(mockProjectsService.delete).toHaveBeenCalledWith('user-1', 'p1');
  });

  describe('WorkspaceProjectsController', () => {
    it('create: передаёт userId, workspaceId и dto', async () => {
      mockProjectsService.create.mockResolvedValue({ id: 'p1' });
      const dto = { name: 'Work' };

      await expect(
        workspaceController.create('user-1', 'ws-1', dto),
      ).resolves.toEqual({ id: 'p1' });
      expect(mockProjectsService.create).toHaveBeenCalledWith(
        'user-1',
        'ws-1',
        dto,
      );
    });

    it('findAllByWorkspaceId: передаёт userId и workspaceId', async () => {
      mockProjectsService.findAllByWorkspaceId.mockResolvedValue([
        { id: 'p1' },
      ]);

      await expect(
        workspaceController.findAllByWorkspaceId('user-1', 'ws-1'),
      ).resolves.toHaveLength(1);
      expect(mockProjectsService.findAllByWorkspaceId).toHaveBeenCalledWith(
        'user-1',
        'ws-1',
      );
    });

    it('reorder: передаёт userId, workspaceId и dto', async () => {
      mockProjectsService.reorder.mockResolvedValue([{ id: 'p1' }]);
      const dto = { parentProjectId: null, orderedIds: ['p1', 'p2'] };

      await expect(
        workspaceController.reorder('user-1', 'ws-1', dto),
      ).resolves.toHaveLength(1);
      expect(mockProjectsService.reorder).toHaveBeenCalledWith(
        'user-1',
        'ws-1',
        dto,
      );
    });
  });
});
