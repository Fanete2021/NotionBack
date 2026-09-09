import { Prisma } from '@prisma/client';

const EMPTY_DOCUMENT: Prisma.InputJsonValue = {
  type: 'doc',
  content: [],
};

export { EMPTY_DOCUMENT };
