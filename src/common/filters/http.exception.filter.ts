import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const responseBody = exception.getResponse();
    const message = this.extractMessage(responseBody);
    const error = this.extractError(responseBody, exception);

    this.logger.error(
      `${request.method} ${request.url} -> ${status} ${error}: ${Array.isArray(message) ? message.join(', ') : message}`,
      exception.stack,
    );

    const errorResponse = {
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }

  private extractMessage(responseBody: string | object): string | string[] {
    if (typeof responseBody === 'string') {
      return responseBody;
    }
    return (responseBody as { message?: string | string[] }).message ?? '';
  }

  private extractError(
    responseBody: string | object,
    exception: HttpException,
  ): string {
    if (typeof responseBody === 'object') {
      const error = (responseBody as { error?: string }).error;
      if (error) {
        return error;
      }
    }
    return exception.name;
  }
}
