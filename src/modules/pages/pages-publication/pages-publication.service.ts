import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PublicationStatus } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PageEntity } from '../entities';
import { SLUG_ATTEMPTS } from './consts';
import { PublishPageDto } from './dto';
import { PagesPublicationRepository } from './pages-publication.repository';
import { slugifyTitle, suffixSlug } from './slug';

@Injectable()
export class PagesPublicationService {
  constructor(
    private readonly pagesPublicationRepository: PagesPublicationRepository,
    @InjectPinoLogger(PagesPublicationService.name)
    private readonly logger: PinoLogger,
  ) {}

  async publish(page: PageEntity, dto: PublishPageDto): Promise<PageEntity> {
    const base = dto.slug ?? page.slug ?? slugifyTitle(page.title);
    const generated = dto.slug === undefined && page.slug === null;

    for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
      const slug = attempt === 0 ? base : suffixSlug(base, attempt + 1);
      try {
        const updated = await this.pagesPublicationRepository.updatePublication(
          page.id,
          publicationData(page, dto, slug),
        );
        if (!updated) {
          throw new NotFoundException('Page not found');
        }

        this.logger.info(
          {
            pageId: page.id,
            workspaceId: page.workspaceId,
            action: 'page_publish',
            status: dto.status,
          },
          'page publication updated',
        );

        return updated;
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
        if (!generated || attempt === SLUG_ATTEMPTS - 1) {
          throw new ConflictException('Slug is already taken');
        }
      }
    }

    throw new ConflictException('Slug is already taken');
  }
}

function publicationData(
  page: PageEntity,
  dto: PublishPageDto,
  slug: string,
): Prisma.PageUncheckedUpdateInput {
  return {
    slug,
    publicationStatus: dto.status,
    ...(dto.seoTitle !== undefined ? { seoTitle: dto.seoTitle } : {}),
    ...(dto.seoDescription !== undefined
      ? { seoDescription: dto.seoDescription }
      : {}),
    ...(dto.status === PublicationStatus.PUBLISHED &&
    page.publicationStatus !== PublicationStatus.PUBLISHED
      ? { publishedAt: new Date() }
      : {}),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
