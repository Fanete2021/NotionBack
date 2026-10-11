import { provideMockPinoLogger } from '@common/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PageType, Prisma, PublicationStatus } from '@prisma/client';
import { PageEntity } from '../entities';
import { SLUG_ATTEMPTS } from './consts';
import { PagesPublicationRepository } from './pages-publication.repository';
import { PagesPublicationService } from './pages-publication.service';

describe('PagesPublicationService', () => {
  let service: PagesPublicationService;

  const mockRepository = {
    updatePublication: jest.fn(),
  };

  const pageFixture = (overrides: Partial<PageEntity> = {}): PageEntity =>
    new PageEntity(
      overrides.id ?? 'p1',
      overrides.workspaceId ?? 'ws-1',
      overrides.projectId ?? 'prj-1',
      overrides.parentPageId ?? null,
      overrides.title ?? 'Введение',
      overrides.icon ?? null,
      overrides.type ?? PageType.DOC,
      overrides.authorId ?? 'user-1',
      overrides.position ?? 0,
      overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
      overrides.updatedAt ?? new Date('2026-01-02T00:00:00.000Z'),
      overrides.slug ?? null,
      overrides.seoTitle ?? null,
      overrides.seoDescription ?? null,
      overrides.publicationStatus ?? null,
      overrides.publishedAt ?? null,
    );

  const p2002 = new Prisma.PrismaClientKnownRequestError('duplicate', {
    code: 'P2002',
    clientVersion: 'test',
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesPublicationService,
        { provide: PagesPublicationRepository, useValue: mockRepository },
        provideMockPinoLogger(PagesPublicationService.name),
      ],
    }).compile();

    service = module.get(PagesPublicationService);
  });

  describe('publish', () => {
    it('собирает slug из заголовка и ставит publishedAt при первой публикации', async () => {
      const updated = { id: 'p1' };
      mockRepository.updatePublication.mockResolvedValue(updated);

      const result = await service.publish(pageFixture(), {
        status: PublicationStatus.PUBLISHED,
      });

      expect(mockRepository.updatePublication).toHaveBeenCalledWith('p1', {
        slug: 'vvedenie',
        publicationStatus: PublicationStatus.PUBLISHED,
        publishedAt: expect.any(Date) as Date,
      });
      expect(result).toBe(updated);
    });

    it('сохраняет переданный slug и seo и не двигает дату повторной публикации', async () => {
      mockRepository.updatePublication.mockResolvedValue({ id: 'p1' });

      await service.publish(
        pageFixture({
          publicationStatus: PublicationStatus.PUBLISHED,
          publishedAt: new Date('2026-05-01T00:00:00.000Z'),
        }),
        {
          slug: 'custom-slug',
          seoTitle: 'Заголовок',
          seoDescription: 'Описание',
          status: PublicationStatus.PUBLISHED,
        },
      );

      expect(mockRepository.updatePublication).toHaveBeenCalledWith('p1', {
        slug: 'custom-slug',
        seoTitle: 'Заголовок',
        seoDescription: 'Описание',
        publicationStatus: PublicationStatus.PUBLISHED,
      });
    });

    it('не переписывает уже выданный slug, если новый не передан', async () => {
      mockRepository.updatePublication.mockResolvedValue({ id: 'p1' });

      await service.publish(
        pageFixture({ slug: 'old-slug', title: 'Совсем другое' }),
        { status: PublicationStatus.HIDDEN },
      );

      expect(mockRepository.updatePublication).toHaveBeenCalledWith('p1', {
        slug: 'old-slug',
        publicationStatus: PublicationStatus.HIDDEN,
      });
    });

    it('при скрытии не обновляет publishedAt', async () => {
      mockRepository.updatePublication.mockResolvedValue({ id: 'p1' });

      await service.publish(
        pageFixture({ publicationStatus: PublicationStatus.PUBLISHED }),
        { status: PublicationStatus.HIDDEN },
      );

      expect(mockRepository.updatePublication).toHaveBeenCalledWith('p1', {
        slug: 'vvedenie',
        publicationStatus: PublicationStatus.HIDDEN,
      });
    });

    it('при коллизии сгенерированного slug берёт следующий номер', async () => {
      mockRepository.updatePublication
        .mockRejectedValueOnce(p2002)
        .mockResolvedValueOnce({ id: 'p1' });

      await service.publish(pageFixture(), {
        status: PublicationStatus.DRAFT,
      });

      expect(mockRepository.updatePublication).toHaveBeenNthCalledWith(
        1,
        'p1',
        expect.objectContaining({ slug: 'vvedenie' }),
      );
      expect(mockRepository.updatePublication).toHaveBeenNthCalledWith(
        2,
        'p1',
        expect.objectContaining({ slug: 'vvedenie-2' }),
      );
    });

    it('возвращает 409, если занят slug, который передал автор', async () => {
      mockRepository.updatePublication.mockRejectedValue(p2002);

      await expect(
        service.publish(pageFixture(), {
          slug: 'taken',
          status: PublicationStatus.DRAFT,
        }),
      ).rejects.toThrow(new ConflictException('Slug is already taken'));
      expect(mockRepository.updatePublication).toHaveBeenCalledTimes(1);
    });

    it('возвращает 409, если свободный slug так и не нашёлся', async () => {
      mockRepository.updatePublication.mockRejectedValue(p2002);

      await expect(
        service.publish(pageFixture(), {
          status: PublicationStatus.PUBLISHED,
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockRepository.updatePublication).toHaveBeenCalledTimes(
        SLUG_ATTEMPTS,
      );
      expect(mockRepository.updatePublication).toHaveBeenLastCalledWith(
        'p1',
        expect.objectContaining({ slug: 'vvedenie-20' }),
      );
    });

    it('возвращает 404, если страница удалена до записи', async () => {
      mockRepository.updatePublication.mockResolvedValue(null);

      await expect(
        service.publish(pageFixture(), {
          status: PublicationStatus.PUBLISHED,
        }),
      ).rejects.toThrow(new NotFoundException('Page not found'));
    });

    it('пробрасывает ошибки, которые не про уникальный slug', async () => {
      mockRepository.updatePublication.mockRejectedValue(new Error('db down'));

      await expect(
        service.publish(pageFixture(), {
          status: PublicationStatus.DRAFT,
        }),
      ).rejects.toThrow('db down');
    });
  });
});
