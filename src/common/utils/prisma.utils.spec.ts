import { Prisma } from '@prisma/client';
import { isNotFoundError } from './prisma.utils';

describe('isNotFoundError', () => {
  it('возвращает true для P2025', () => {
    const error = new Prisma.PrismaClientKnownRequestError('not found', {
      code: 'P2025',
      clientVersion: 'test',
    });

    expect(isNotFoundError(error)).toBe(true);
  });

  it('возвращает false для других Prisma-кодов', () => {
    const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
    });

    expect(isNotFoundError(error)).toBe(false);
  });

  it('возвращает false для обычных ошибок', () => {
    expect(isNotFoundError(new Error('fail'))).toBe(false);
  });
});
