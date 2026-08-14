import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const httpException = this.toHttpException(exception);
    const status = httpException.getStatus();

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> Prisma error ${exception.code}: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      message: httpException.message,
      error: httpException.name,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private toHttpException(
    exception: Prisma.PrismaClientKnownRequestError,
  ): HttpException {
    switch (exception.code) {
      case 'P2002':
        return new ConflictException(
          'A record with the same unique value already exists',
        );
      case 'P2003':
        return new BadRequestException(
          'Referenced record does not exist or is in a different workspace',
        );
      case 'P2025':
        return new NotFoundException('Record not found');
      default:
        return new InternalServerErrorException('Database operation failed');
    }
  }
}
