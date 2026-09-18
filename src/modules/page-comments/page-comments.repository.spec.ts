import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PageCommentsRepository } from './page-comments.repository';
import { PrismaService } from '../../prisma';
import { PageCommentEntity } from './entities';

describe('PageCommentsRepository', () => {
  let repository: PageCommentsRepository;

  const mockPrisma = {
    page: {
      findUnique: jest.fn(),
    },
    pageComment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const authorFixture = {
    id: 'user-1',
    name: 'Author',
    email: 'author@example.com',
    avatarUrl: null,
  };

  const commentFixture = {
    id: 'comment-1',
    pageId: 'page-1',
    authorId: 'user-1',
    body: 'Hello',
    anchorId: 'anchor-1',
    resolved: false,
    resolvedAt: null,
    resolvedById: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    author: authorFixture,
    resolvedBy: null,
  };

  const p2025 = new Prisma.PrismaClientKnownRequestError('not found', {
    code: 'P2025',
    clientVersion: 'test',
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageCommentsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get(PageCommentsRepository);
  });

  describe('assertActivePage', () => {
    it('бросает 404, если страница не найдена или удалена', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(repository.assertActivePage('page-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('не бросает, если страница активна', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'page-1' });

      await expect(
        repository.assertActivePage('page-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('create', () => {
    it('создаёт комментарий с автором', async () => {
      mockPrisma.pageComment.create.mockResolvedValue(commentFixture);

      const result = await repository.create(
        'page-1',
        'user-1',
        'Hello',
        'anchor-1',
      );

      expect(mockPrisma.pageComment.create).toHaveBeenCalledWith({
        data: {
          pageId: 'page-1',
          authorId: 'user-1',
          body: 'Hello',
          anchorId: 'anchor-1',
        },
        include: expect.any(Object) as object,
      });
      expect(result).toBeInstanceOf(PageCommentEntity);
      expect(result.authorInfo.id).toBe('user-1');
    });
  });

  describe('findAllByPageId', () => {
    it('фильтрует по anchorId и resolved', async () => {
      mockPrisma.pageComment.findMany.mockResolvedValue([commentFixture]);

      await repository.findAllByPageId('page-1', {
        anchorId: 'anchor-1',
        resolved: false,
      });

      expect(mockPrisma.pageComment.findMany).toHaveBeenCalledWith({
        where: {
          pageId: 'page-1',
          anchorId: 'anchor-1',
          resolved: false,
        },
        include: expect.any(Object) as object,
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('updateBody', () => {
    it('обновляет текст', async () => {
      mockPrisma.pageComment.update.mockResolvedValue({
        ...commentFixture,
        body: 'Updated',
      });

      const result = await repository.updateBody(
        'comment-1',
        'page-1',
        'Updated',
      );

      expect(result?.body).toBe('Updated');
    });

    it('возвращает null при P2025', async () => {
      mockPrisma.pageComment.update.mockRejectedValue(p2025);

      await expect(
        repository.updateBody('ghost', 'page-1', 'X'),
      ).resolves.toBeNull();
    });
  });

  describe('setResolved', () => {
    it('проставляет resolved и resolvedBy', async () => {
      mockPrisma.pageComment.update.mockResolvedValue({
        ...commentFixture,
        resolved: true,
        resolvedAt: new Date('2026-02-01'),
        resolvedById: 'user-2',
        resolvedBy: { ...authorFixture, id: 'user-2' },
      });

      const result = await repository.setResolved(
        'comment-1',
        'page-1',
        true,
        'user-2',
        new Date('2026-02-01'),
      );

      expect(result?.resolved).toBe(true);
      expect(result?.resolvedBy?.id).toBe('user-2');
    });
  });

  describe('delete', () => {
    it('удаляет комментарий', async () => {
      mockPrisma.pageComment.delete.mockResolvedValue(commentFixture);

      await expect(repository.delete('comment-1', 'page-1')).resolves.toBe(
        true,
      );
    });

    it('возвращает false при P2025', async () => {
      mockPrisma.pageComment.delete.mockRejectedValue(p2025);

      await expect(repository.delete('ghost', 'page-1')).resolves.toBe(false);
    });
  });
});
