import { Prisma } from '@prisma/client';

const PAGE_CONTENT_ROUTE = 'pages/:id/content';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const EMPTY_DOCUMENT: Prisma.InputJsonValue = {
  type: 'doc',
  content: [],
};

export { PAGE_CONTENT_ROUTE, EMPTY_DOCUMENT, DAY_IN_MS };
