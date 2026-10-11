import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, PublicationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma';
import { PagesPublicationRepository } from './pages-publication.repository';

describe('PagesPublicationRepository', () => {
  let repository: PagesPublicationRepository;

  const mockPrisma = {
    page: {
      update: jest.fn(),
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
});
