import { HttpExceptionsFilter } from './http-exception.filter';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

describe('HttpExceptionsFilter', () => {
  let filter: HttpExceptionsFilter;

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

  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    loggerWarnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});

    filter = new HttpExceptionsFilter();
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
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
