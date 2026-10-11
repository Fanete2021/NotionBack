import { Prisma } from '@prisma/client';

const PUBLIC_ARTICLE_SELECT = {
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
} satisfies Prisma.PageSelect;

const PUBLIC_ARTICLE_DETAIL_SELECT = {
  ...PUBLIC_ARTICLE_SELECT,
  content: {
    select: {
      json: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.PageSelect;

type PublicArticleRow = Prisma.PageGetPayload<{
  select: typeof PUBLIC_ARTICLE_SELECT;
}>;

type PublicArticleDetailRow = Prisma.PageGetPayload<{
  select: typeof PUBLIC_ARTICLE_DETAIL_SELECT;
}>;

interface PublicArticlePage {
  items: PublicArticleRow[];
  nextCursor: string | null;
}

interface ListPublicArticlesOptions {
  cursor?: string;
  take: number;
}

export { PUBLIC_ARTICLE_DETAIL_SELECT, PUBLIC_ARTICLE_SELECT };
export type {
  ListPublicArticlesOptions,
  PublicArticleDetailRow,
  PublicArticlePage,
  PublicArticleRow,
};
