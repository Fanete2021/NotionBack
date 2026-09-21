import { HttpExceptionsFilter } from './http-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import {
  asPinoLogger,
  createMockPinoLogger,
  MockPinoLogger,
} from '@common/testing';

describe('HttpExceptionsFilter', () => {
  let filter: HttpExceptionsFilter;
  let logger: MockPinoLogger;

  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnThis();
  const responseMock = { status: statusMock, json: jsonMock };
  const requestMock = { url: '/api/test', method: 'GET' };

  const hostMock = {
    switchToHttp: () => ({
      getResponse: () => responseMock,
      getRequest: () => requestMock,
    }),
  } as unknown as ArgumentsHost;

  let loggerErrorSpy: jest.Mock;
  let loggerWarnSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = createMockPinoLogger();
    loggerErrorSpy = logger.error;
    loggerWarnSpy = logger.warn;

    filter = new HttpExceptionsFilter(asPinoLogger(logger));
  });

  it('должен корректно обрабатывать стандартную ошибку (например, 404)', () => {
    const error = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(error, hostMock);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Not Found',
        path: '/api/test',
      }),
    );
    expect(loggerWarnSpy).toHaveBeenCalled();
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('должен правильно извлекать массив ошибок валидации (ValidationPipe)', () => {
    const validationErrors = [
      'email must be an email',
      'password is too short',
    ];
    const error = new HttpException(
      { message: validationErrors, error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(error, hostMock);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: validationErrors,
        error: 'Bad Request',
        path: '/api/test',
      }),
    );
    expect(loggerWarnSpy).toHaveBeenCalled();
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('должен логировать ошибки 500 через error', () => {
    const error = new HttpException(
      'Internal Server Error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    filter.catch(error, hostMock);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(loggerErrorSpy).toHaveBeenCalled();
    expect(loggerWarnSpy).not.toHaveBeenCalled();
  });
});
