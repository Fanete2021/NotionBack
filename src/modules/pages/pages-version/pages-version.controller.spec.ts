jest.mock('@nestjs/bullmq', () => ({
  BullModule: {
    registerQueue: jest.fn(() => ({})),
    forRoot: jest.fn(() => ({})),
  },
  InjectQueue: jest.fn(() => jest.fn()),
  Processor: jest.fn(() => jest.fn()),
  WorkerHost: class {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { PageContentEntity } from '../pages-content/entities';
import { PagesService } from '../pages.service';
import { PageVersionEntity, PageVersionListEntity } from './entities';
import { PagesVersionController } from './pages-version.controller';
import { PagesVersionService } from './pages-version.service';

describe('PagesVersionController', () => {
  let controller: PagesVersionController;

  const mockPagesVersionService = {
    findById: jest.fn(),
    list: jest.fn(),
    restore: jest.fn(),
  };

  const mockPagesService = {
    findById: jest.fn(),
  };

  const mockWorkspacesService = {
    assertMemberOf: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PagesVersionController],
      providers: [
        { provide: PagesVersionService, useValue: mockPagesVersionService },
        { provide: PagesService, useValue: mockPagesService },
        { provide: WorkspacesService, useValue: mockWorkspacesService },
      ],
    }).compile();

    controller = module.get(PagesVersionController);
  });

  describe('list', () => {
    const page = { id: 'page-1', workspaceId: 'ws-1' };
    const createdAt = new Date('2026-09-01T00:00:00.000Z');
    const item = {
      id: 'ver-1',
      pageId: 'page-1',
      authorId: 'user-2',
      label: '2026-09-01T00:00:00.000Z',
      createdAt,
    };

    it('проверяет членство и возвращает страницу истории', async () => {
      mockPagesService.findById.mockResolvedValue(page);
      mockPagesVersionService.list.mockResolvedValue({
        items: [item],
        nextCursor: 'ver-1',
      });

      const query = { limit: 20 };
      const result = await controller.list('user-1', 'page-1', query);

      expect(mockPagesService.findById).toHaveBeenCalledWith('page-1');
      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockPagesVersionService.list).toHaveBeenCalledWith(
        'page-1',
        query,
      );
      expect(
        mockWorkspacesService.assertMemberOf.mock.invocationCallOrder[0],
      ).toBeLessThan(mockPagesVersionService.list.mock.invocationCallOrder[0]);
      expect(result).toEqual(
        new PageVersionListEntity(
          [
            new PageVersionEntity(
              item.id,
              item.pageId,
              item.authorId,
              item.label,
              item.createdAt,
            ),
          ],
          'ver-1',
        ),
      );
    });

    it('не читает историю, если пользователь не член воркспейса', async () => {
      mockPagesService.findById.mockResolvedValue(page);
      mockWorkspacesService.assertMemberOf.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(controller.list('user-1', 'page-1', {})).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockPagesVersionService.list).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    const version = {
      id: 'ver-1',
      pageId: 'page-1',
      snapshot: { type: 'doc', content: [] },
    };
    const page = { id: 'page-1', workspaceId: 'ws-1' };
    const updatedAt = new Date('2026-09-02T00:00:00.000Z');
    const content = {
      pageId: 'page-1',
      json: { type: 'doc', content: [] },
      updatedAt,
    };

    it('проверяет членство страницы версии и возвращает контент', async () => {
      mockPagesVersionService.findById.mockResolvedValue(version);
      mockPagesService.findById.mockResolvedValue(page);
      mockPagesVersionService.restore.mockResolvedValue(content);

      const result = await controller.restore('user-1', 'ver-1');

      expect(mockPagesVersionService.findById).toHaveBeenCalledWith('ver-1');
      expect(mockPagesService.findById).toHaveBeenCalledWith('page-1');
      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockPagesVersionService.restore).toHaveBeenCalledWith(
        version,
        'user-1',
      );
      expect(
        mockPagesService.findById.mock.invocationCallOrder[0],
      ).toBeLessThan(
        mockWorkspacesService.assertMemberOf.mock.invocationCallOrder[0],
      );
      expect(
        mockWorkspacesService.assertMemberOf.mock.invocationCallOrder[0],
      ).toBeLessThan(
        mockPagesVersionService.restore.mock.invocationCallOrder[0],
      );
      expect(result).toEqual(
        new PageContentEntity(content.pageId, content.json, content.updatedAt),
      );
    });

    it('не проверяет членство, если версия не найдена', async () => {
      mockPagesVersionService.findById.mockRejectedValue(
        new NotFoundException('Page version not found'),
      );

      await expect(controller.restore('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPagesService.findById).not.toHaveBeenCalled();
      expect(mockWorkspacesService.assertMemberOf).not.toHaveBeenCalled();
      expect(mockPagesVersionService.restore).not.toHaveBeenCalled();
    });

    it('не проверяет членство, если страница версии не найдена', async () => {
      mockPagesVersionService.findById.mockResolvedValue(version);
      mockPagesService.findById.mockRejectedValue(
        new NotFoundException('Page not found'),
      );

      await expect(controller.restore('user-1', 'ver-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockWorkspacesService.assertMemberOf).not.toHaveBeenCalled();
      expect(mockPagesVersionService.restore).not.toHaveBeenCalled();
    });
  });
});
