import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, PublicationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma';
import { PagesPublicationRepository } from './pages-publication.repository';

describe('PagesPublicationRepository', () => {
  let repository: PagesPublicationRepository;

  const mockPrisma = {
    page: {
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const publishedWhere = {
    publicationStatus: PublicationStatus.PUBLISHED,
    deletedAt: null,
    slug: { not: null },
    publishedAt: { not: null },
  };

  const articleSelect = {
    id: true,
    slug: true,
    title: true,
    icon: true,
    seoTitle: true,
    seoDescription: true,
    publishedAt: true,
    updatedAt: true,
    author: {
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesPublicationRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get(PagesPublicationRepository);
  });

  describe('updatePublication', () => {
    it('обновляет публикацию страницы по id', async () => {
      const data = {
        slug: 'vvedenie',
        publicationStatus: PublicationStatus.PUBLISHED,
      };
      mockPrisma.page.update.mockResolvedValue({ id: 'p1' });

      await repository.updatePublication('p1', data);

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'p1', deletedAt: null },
        data,
      });
    });

    it('возвращает null, если страница уже удалена', async () => {
      mockPrisma.page.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(
        repository.updatePublication('p1', { slug: 'vvedenie' }),
      ).resolves.toBeNull();
    });
  });

  describe('findPublished', () => {
    it('берёт только опубликованные неудалённые статьи без контента и email', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      await repository.findPublished({ take: 21 });

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: publishedWhere,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 21,
        select: articleSelect,
      });
    });

    it('листает курсором по id', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      await repository.findPublished({ cursor: 'p1', take: 21 });

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: publishedWhere,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 21,
        cursor: { id: 'p1' },
        skip: 1,
        select: articleSelect,
      });
    });
  });

  describe('findPublishedBySlug', () => {
    it('ищет опубликованную статью по slug вместе с json контента', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await repository.findPublishedBySlug('vvedenie');

      expect(mockPrisma.page.findFirst).toHaveBeenCalledWith({
        where: { ...publishedWhere, slug: 'vvedenie' },
        select: {
          ...articleSelect,
          content: {
            select: {
              json: true,
              updatedAt: true,
            },
          },
        },
      });
    });
  });
});
