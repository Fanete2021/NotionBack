import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';

type HttpExceptionPayload = {
  message: string | string[];
  error: string;
};

@Catch(HttpException)
export class HttpExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(HttpExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const { message, error } = this.extractPayload(exception);

    const errorResponse = {
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    const meta = {
      method: request.method,
      url: request.url,
      statusCode: status,
      message,
    };

    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error({ ...meta, err: exception }, 'request failed');
      Sentry.captureException(exception, {
        mechanism: { handled: true, type: 'nestjs.http_exception_filter' },
      });
    } else {
      this.logger.warn(meta, 'request rejected');
    }

    response.status(status).json(errorResponse);
  }

  private extractPayload(exception: HttpException): HttpExceptionPayload {
    const payload = exception.getResponse();

    if (typeof payload === 'string') {
      return { message: payload, error: exception.name };
    }

    const body = payload as { message?: string | string[]; error?: string };

    return {
      message: body.message ?? exception.message,
      error: body.error ?? exception.name,
    };
  }
}
