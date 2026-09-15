import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PageCommentsController } from '@modules/page-comments/page-comments.controller';
import { PageCommentsService } from '@modules/page-comments/page-comments.service';
import { PagesService } from '@modules/pages/pages.service';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';

describe('PageCommentsController', () => {
  let controller: PageCommentsController;

  const mockPageCommentsService = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setResolved: jest.fn(),
    delete: jest.fn(),
  };

  const mockPagesService = {
    findById: jest.fn(),
  };

  const mockWorkspacesService = {
    assertMemberOf: jest.fn(),
  };

  const page = {
    id: 'page-1',
    workspaceId: 'ws-1',
    title: 'Page',
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPagesService.findById.mockResolvedValue(page);
    mockWorkspacesService.assertMemberOf.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PageCommentsController],
      providers: [
        { provide: PageCommentsService, useValue: mockPageCommentsService },
        { provide: PagesService, useValue: mockPagesService },
        { provide: WorkspacesService, useValue: mockWorkspacesService },
      ],
    }).compile();

    controller = module.get(PageCommentsController);
  });

  it('list проверяет членство и делегирует в сервис', async () => {
    mockPageCommentsService.list.mockResolvedValue([]);

    await controller.list('user-1', 'page-1', {});

    expect(mockPagesService.findById).toHaveBeenCalledWith('page-1');
    expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
      'ws-1',
      'user-1',
    );
    expect(mockPageCommentsService.list).toHaveBeenCalledWith('page-1', {});
  });

  it('create проверяет членство', async () => {
    mockPageCommentsService.create.mockResolvedValue({ id: 'c1' });

    await controller.create('user-1', 'page-1', { body: 'Hi' });

    expect(mockPageCommentsService.create).toHaveBeenCalledWith(
      'page-1',
      'user-1',
      { body: 'Hi' },
    );
  });

  it('не вызывает сервис при 403 от assertMemberOf', async () => {
    mockWorkspacesService.assertMemberOf.mockRejectedValue(
      new ForbiddenException(),
    );

    await expect(controller.list('user-1', 'page-1', {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockPageCommentsService.list).not.toHaveBeenCalled();
  });
});
