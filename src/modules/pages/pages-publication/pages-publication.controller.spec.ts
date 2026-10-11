import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PublicationStatus } from '@prisma/client';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { PagesService } from '../pages.service';
import { PagesPublicationController } from './pages-publication.controller';
import { PagesPublicationService } from './pages-publication.service';

describe('PagesPublicationController', () => {
  let controller: PagesPublicationController;

  const mockPagesPublicationService = {
    publish: jest.fn(),
  };

  const mockPagesService = {
    findById: jest.fn(),
  };

  const mockWorkspacesService = {
    assertMemberOf: jest.fn(),
  };

  const page = { id: 'p1', workspaceId: 'ws-1' };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PagesPublicationController],
      providers: [
        {
          provide: PagesPublicationService,
          useValue: mockPagesPublicationService,
        },
        { provide: PagesService, useValue: mockPagesService },
        { provide: WorkspacesService, useValue: mockWorkspacesService },
      ],
    }).compile();

    controller = module.get(PagesPublicationController);
  });

  describe('publish', () => {
    const dto = { status: PublicationStatus.PUBLISHED };

    it('проверяет членство и публикует страницу', async () => {
      mockPagesService.findById.mockResolvedValue(page);
      mockPagesPublicationService.publish.mockResolvedValue({ id: 'p1' });

      const result = await controller.publish('user-1', 'p1', dto);

      expect(mockPagesService.findById).toHaveBeenCalledWith('p1');
      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockPagesPublicationService.publish).toHaveBeenCalledWith(
        page,
        dto,
      );
      expect(
        mockPagesService.findById.mock.invocationCallOrder[0],
      ).toBeLessThan(
        mockWorkspacesService.assertMemberOf.mock.invocationCallOrder[0],
      );
      expect(result).toEqual({ id: 'p1' });
    });

    it('не публикует, если пользователя нет в воркспейсе', async () => {
      mockPagesService.findById.mockResolvedValue(page);
      mockWorkspacesService.assertMemberOf.mockRejectedValue(
        new ForbiddenException('You are not a member of this workspace'),
      );

      await expect(controller.publish('user-1', 'p1', dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPagesPublicationService.publish).not.toHaveBeenCalled();
    });

    it('не проверяет членство, если страница не найдена', async () => {
      mockPagesService.findById.mockRejectedValue(
        new NotFoundException('Page not found'),
      );

      await expect(
        controller.publish('user-1', 'missing', dto),
      ).rejects.toThrow(NotFoundException);
      expect(mockWorkspacesService.assertMemberOf).not.toHaveBeenCalled();
      expect(mockPagesPublicationService.publish).not.toHaveBeenCalled();
    });
  });
});
