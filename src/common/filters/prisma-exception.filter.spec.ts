import { PrismaExceptionFilter } from './prisma-exception.filter';
import { Prisma } from '@prisma/client';
import { ArgumentsHost } from '@nestjs/common';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;

  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnThis();
  const responseMock = { status: statusMock, json: jsonMock };
  const requestMock = { url: '/api/test' };

  const hostMock = {
    switchToHttp: () => ({
      getResponse: () => responseMock,
      getRequest: () => requestMock,
    }),
  } as unknown as ArgumentsHost;

  const knownError = (code: string): Prisma.PrismaClientKnownRequestError =>
    new Prisma.PrismaClientKnownRequestError('msg', {
      code,
      clientVersion: 'test',
    });

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new PrismaExceptionFilter();
  });

  it.each([
    ['P2002', 409],
    ['P2003', 400],
    ['P2025', 404],
    ['P9999', 500],
  ])('маппит %s -> %i', (code, status) => {
    filter.catch(knownError(code), hostMock);

    expect(statusMock).toHaveBeenCalledWith(status);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: status,
        path: '/api/test',
      }),
    );
  });
});
