import { Test, TestingModule } from '@nestjs/testing';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PagesController', () => {
  let controller: PagesController;

  const mockPagesService = {
    create: jest.fn(),
    findAllByWorkspaceId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getContent: jest.fn(),
    updateContent: jest.fn(),
  };

  const mockWorkspacesService = {
    assertMemberOf: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PagesController],
      providers: [
        { provide: PagesService, useValue: mockPagesService },
        { provide: WorkspacesService, useValue: mockWorkspacesService },
      ],
    }).compile();

    controller = module.get<PagesController>(PagesController);
  });

  describe('create', () => {
    it('проверяет членство и создаёт страницу', async () => {
      const dto = {
        title: 'Введение',
        workspaceId: 'ws-1',
        projectId: 'prj-1',
      };
      mockPagesService.create.mockResolvedValue({ id: 'p1' });

      const result = await controller.create('user-1', dto);

      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockPagesService.create).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
        dto,
      );
      expect(result).toEqual({ id: 'p1' });
    });

    it('пробрасывает 403 от assertMemberOf', async () => {
      mockWorkspacesService.assertMemberOf.mockRejectedValue(
        new ForbiddenException('You are not a member of this workspace'),
      );

      await expect(
        controller.create('user-1', {
          title: 'X',
          workspaceId: 'ws-1',
          projectId: 'prj-1',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPagesService.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('проверяет членство по воркспейсу страницы', async () => {
      mockPagesService.findById.mockResolvedValue({
        id: 'p1',
        workspaceId: 'ws-1',
      });

      const result = await controller.findById('user-1', 'p1');

      expect(mockPagesService.findById).toHaveBeenCalledWith('p1');
      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(result).toEqual({ id: 'p1', workspaceId: 'ws-1' });
    });

    it('пробрасывает 404, если страница не найдена', async () => {
      mockPagesService.findById.mockRejectedValue(
        new NotFoundException('Page not found'),
      );

      await expect(controller.findById('user-1', 'ghost')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockWorkspacesService.assertMemberOf).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('проверяет членство и обновляет страницу', async () => {
      const dto = { title: 'New' };
      mockPagesService.findById.mockResolvedValue({
        id: 'p1',
        workspaceId: 'ws-1',
      });
      mockPagesService.update.mockResolvedValue({ id: 'p1' });

      const result = await controller.update('user-1', 'p1', dto);

      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockPagesService.update).toHaveBeenCalledWith('p1', dto);
      expect(result).toEqual({ id: 'p1' });
    });
  });

  describe('delete', () => {
    it('проверяет членство и удаляет страницу', async () => {
      mockPagesService.findById.mockResolvedValue({
        id: 'p1',
        workspaceId: 'ws-1',
      });
      mockPagesService.delete.mockResolvedValue(undefined);

      await expect(controller.delete('user-1', 'p1')).resolves.toBeUndefined();
      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockPagesService.delete).toHaveBeenCalledWith('p1');
    });
  });

  describe('getContent', () => {
    it('проверяет членство и возвращает контент', async () => {
      mockPagesService.findById.mockResolvedValue({
        id: 'p1',
        workspaceId: 'ws-1',
      });
      mockPagesService.getContent.mockResolvedValue({ pageId: 'p1' });

      const result = await controller.getContent('user-1', 'p1');

      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockPagesService.getContent).toHaveBeenCalledWith('p1');
      expect(result).toEqual({ pageId: 'p1' });
    });
  });

  describe('updateContent', () => {
    it('проверяет членство и перезаписывает контент', async () => {
      const body = { type: 'doc', content: [] };
      mockPagesService.findById.mockResolvedValue({
        id: 'p1',
        workspaceId: 'ws-1',
      });
      mockPagesService.updateContent.mockResolvedValue({
        pageId: 'p1',
        json: body,
      });

      const result = await controller.updateContent('user-1', 'p1', body);

      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockPagesService.updateContent).toHaveBeenCalledWith('p1', body);
      expect(result).toEqual({ pageId: 'p1', json: body });
    });
  });

  describe('findAllByWorkspaceId', () => {
    it('проверяет членство и возвращает страницы воркспейса', async () => {
      mockPagesService.findAllByWorkspaceId.mockResolvedValue([{ id: 'p1' }]);

      const result = await controller.findAllByWorkspaceId(
        'user-1',
        'ws-1',
        'prj-1',
      );

      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockPagesService.findAllByWorkspaceId).toHaveBeenCalledWith(
        'ws-1',
        'prj-1',
      );
      expect(result).toHaveLength(1);
    });

    it('передаёт undefined без projectId', async () => {
      mockPagesService.findAllByWorkspaceId.mockResolvedValue([]);

      await controller.findAllByWorkspaceId('user-1', 'ws-1');

      expect(mockPagesService.findAllByWorkspaceId).toHaveBeenCalledWith(
        'ws-1',
        undefined,
      );
    });
  });
});
