import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PublicationStatus } from '@prisma/client';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { EMPTY_DOCUMENT } from '../constants';
import { PagesService } from '../pages.service';
import {
  PublicArticleDetailEntity,
  PublicArticleEntity,
  PublicArticleListEntity,
} from './entities';
import {
  PagesPublicationController,
  PublicArticlesController,
} from './pages-publication.controller';
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

describe('PublicArticlesController', () => {
  let controller: PublicArticlesController;

  const publishedAt = new Date('2026-10-01T00:00:00.000Z');
  const updatedAt = new Date('2026-10-02T00:00:00.000Z');
  const author = { id: 'user-1', name: 'Иван', avatarUrl: null };
  const row = {
    id: 'p1',
    slug: 'vvedenie',
    title: 'Введение',
    icon: '📄',
    seoTitle: 'SEO',
    seoDescription: 'Описание',
    publishedAt,
    updatedAt,
    author,
  };

  const mockPagesPublicationService = {
    list: jest.fn(),
    findBySlug: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicArticlesController],
      providers: [
        {
          provide: PagesPublicationService,
          useValue: mockPagesPublicationService,
        },
      ],
    }).compile();

    controller = module.get(PublicArticlesController);
  });

  describe('list', () => {
    it('собирает карточки ленты без контента и email', async () => {
      mockPagesPublicationService.list.mockResolvedValue({
        items: [row],
        nextCursor: 'p2',
      });

      const result = await controller.list({ limit: 20 });

      expect(result).toBeInstanceOf(PublicArticleListEntity);
      expect(result.items[0]).toBeInstanceOf(PublicArticleEntity);
      expect(result.items[0]).toEqual(
        new PublicArticleEntity(
          'p1',
          'vvedenie',
          'Введение',
          '📄',
          'SEO',
          'Описание',
          publishedAt,
          updatedAt,
          expect.objectContaining({
            id: 'user-1',
            name: 'Иван',
            avatarUrl: null,
          }) as PublicArticleEntity['author'],
        ),
      );
      expect(result.items[0]).not.toHaveProperty('content');
      expect(result.items[0].author).not.toHaveProperty('email');
      expect(result.nextCursor).toBe('p2');
    });
  });

  describe('findBySlug', () => {
    it('отдаёт статью с контентом', async () => {
      const contentUpdatedAt = new Date('2026-10-03T00:00:00.000Z');
      const json = { type: 'doc', content: [{ type: 'paragraph' }] };
      mockPagesPublicationService.findBySlug.mockResolvedValue({
        ...row,
        content: { json, updatedAt: contentUpdatedAt },
      });

      const result = await controller.findBySlug('vvedenie');

      expect(mockPagesPublicationService.findBySlug).toHaveBeenCalledWith(
        'vvedenie',
      );
      expect(result).toBeInstanceOf(PublicArticleDetailEntity);
      expect(result.content).toEqual({
        json,
        updatedAt: contentUpdatedAt,
      });
      expect(result.author).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('workspaceId');
    });

    it('подставляет пустой документ, если контента ещё нет', async () => {
      mockPagesPublicationService.findBySlug.mockResolvedValue({
        ...row,
        content: null,
      });

      const result = await controller.findBySlug('vvedenie');

      expect(result.content.json).toEqual(EMPTY_DOCUMENT);
      expect(result.content.updatedAt).toBe(updatedAt);
    });

    it('пробрасывает 404', async () => {
      mockPagesPublicationService.findBySlug.mockRejectedValue(
        new NotFoundException('Article not found'),
      );

      await expect(controller.findBySlug('hidden')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
