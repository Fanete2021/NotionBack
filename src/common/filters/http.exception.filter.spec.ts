import { HttpExceptionFilter } from './http.exception.filter';
import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  const jsonMock = jest.fn<void, [ErrorBody]>();
  const statusMock = jest.fn().mockReturnThis();
  const responseMock = { status: statusMock, json: jsonMock };
  const requestMock = { url: '/api/test', method: 'GET' };

  const hostMock = {
    switchToHttp: () => ({
      getResponse: () => responseMock,
      getRequest: () => requestMock,
    }),
  } as unknown as ArgumentsHost;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new HttpExceptionFilter();
  });

  it('маппит HttpException в стандартное тело ответа', () => {
    const exception = new BadRequestException('Bad input');

    filter.catch(exception, hostMock);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledTimes(1);
    const body = jsonMock.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: 400,
      message: 'Bad input',
      error: 'Bad Request',
      path: '/api/test',
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('сохраняет message-массив из getResponse() (ошибки ValidationPipe)', () => {
    const messages: string[] = [
      'field must be a string',
      'other must not be empty',
    ];
    const exception = new BadRequestException(messages);

    filter.catch(exception, hostMock);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: messages,
        error: 'Bad Request',
      }),
    );
  });

  it('маппит 404 NotFoundException', () => {
    const exception = new NotFoundException('Not found');

    filter.catch(exception, hostMock);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'Not Found',
      }),
    );
  });
});
