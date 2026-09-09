import { Prisma } from '@prisma/client';

const PAGE_CONTENT_ROUTE = 'pages/:id/content';

const EMPTY_DOCUMENT: Prisma.InputJsonValue = {
  type: 'doc',
  content: [],
};

export { PAGE_CONTENT_ROUTE, EMPTY_DOCUMENT };
