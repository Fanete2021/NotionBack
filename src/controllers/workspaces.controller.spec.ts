import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from '../services/workspaces.service';

describe('WorkspacesController', () => {
  let controller: WorkspacesController;

  const mockWorkspacesService = {
    create: jest.fn(),
    findAllByUserId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [
        { provide: WorkspacesService, useValue: mockWorkspacesService },
      ],
    }).compile();

    controller = module.get(WorkspacesController);
  });

  it('create делегирует имя и userId в сервис', async () => {
    mockWorkspacesService.create.mockResolvedValue({ id: 'ws-1' });

    await controller.create('user-1', { name: 'My space' });

    expect(mockWorkspacesService.create).toHaveBeenCalledWith(
      'user-1',
      'My space',
    );
  });

  it('findAllByUserId делегирует в сервис', async () => {
    mockWorkspacesService.findAllByUserId.mockResolvedValue([]);

    await controller.findAllByUserId('user-1');

    expect(mockWorkspacesService.findAllByUserId).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('findById передаёт workspaceId и userId', async () => {
    mockWorkspacesService.findById.mockResolvedValue({ id: 'ws-1' });

    await controller.findById('user-1', 'ws-1');

    expect(mockWorkspacesService.findById).toHaveBeenCalledWith(
      'ws-1',
      'user-1',
    );
  });
});
