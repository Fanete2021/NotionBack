import { isNotFoundError } from '@common/utils';
import { Injectable } from '@nestjs/common';
import { Page, Prisma, PublicationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma';
import {
  ListPublicArticlesOptions,
  PUBLIC_ARTICLE_DETAIL_SELECT,
  PUBLIC_ARTICLE_SELECT,
  PublicArticleDetailRow,
  PublicArticleRow,
} from './pages-publication.types';

@Injectable()
export class PagesPublicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  updatePublication(
    id: string,
    data: Prisma.PageUncheckedUpdateInput,
  ): Promise<Page | null> {
    return this.prisma.page
      .update({
        where: { id, deletedAt: null },
        data,
      })
      .catch((error) => {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      });
  }

  findPublished(
    options: ListPublicArticlesOptions,
  ): Promise<PublicArticleRow[]> {
    return this.prisma.page.findMany({
      where: publishedWhere,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: options.take,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      select: PUBLIC_ARTICLE_SELECT,
    });
  }

  findPublishedBySlug(slug: string): Promise<PublicArticleDetailRow | null> {
    return this.prisma.page.findFirst({
      where: { ...publishedWhere, slug },
      select: PUBLIC_ARTICLE_DETAIL_SELECT,
    });
  }
}

const publishedWhere = {
  publicationStatus: PublicationStatus.PUBLISHED,
  deletedAt: null,
  slug: { not: null },
  publishedAt: { not: null },
} satisfies Prisma.PageWhereInput;
