jest.mock('@nestjs/bullmq', () => ({
  BullModule: {
    registerQueue: jest.fn(() => ({})),
    forRoot: jest.fn(() => ({})),
  },
  InjectQueue: jest.fn(() => jest.fn()),
  Processor: jest.fn(() => jest.fn()),
  WorkerHost: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { PagesService } from '../pages.service';
import { PagesContentController } from './pages-content.controller';
import { PagesContentService } from './pages-content.service';

describe('PagesContentController', () => {
  let controller: PagesContentController;

  const mockPagesService = {
    create: jest.fn(),
    findAllByWorkspaceId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getContent: jest.fn(),
    updateContent: jest.fn(),
  };

  const mockPagesContentService = {
    getContent: jest.fn(),
    updateContent: jest.fn(),
  };

  const mockWorkspacesService = {
    assertMemberOf: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PagesContentController],
      providers: [
        { provide: PagesService, useValue: mockPagesService }, // Добавить PagesService
        { provide: PagesContentService, useValue: mockPagesContentService },
        { provide: WorkspacesService, useValue: mockWorkspacesService },
      ],
    }).compile();

    controller = module.get<PagesContentController>(PagesContentController);
  });

  describe('getContent', () => {
    it('проверяет членство и возвращает контент', async () => {
      const page = { id: 'p1', workspaceId: 'ws-1' };
      mockPagesService.findById.mockResolvedValue(page);
      mockPagesContentService.getContent.mockResolvedValue({ pageId: 'p1' });

      const result = await controller.getContent('user-1', 'p1');

      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockPagesContentService.getContent).toHaveBeenCalledWith(page);
      expect(result).toEqual({ pageId: 'p1' });
    });
  });

  describe('updateContent', () => {
    it('проверяет членство и перезаписывает контент', async () => {
      const body = { type: 'doc', content: [] };
      const page = { id: 'p1', workspaceId: 'ws-1' };
      mockPagesService.findById.mockResolvedValue(page);
      mockPagesContentService.updateContent.mockResolvedValue({
        pageId: 'p1',
        json: body,
      });

      const result = await controller.updateContent('user-1', 'p1', body);

      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockPagesContentService.updateContent).toHaveBeenCalledWith(
        page,
        body,
      );
      expect(result).toEqual({ pageId: 'p1', json: body });
    });
  });
});
