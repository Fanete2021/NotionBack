import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  HttpStatus,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as Sentry from '@sentry/nestjs';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(PrismaExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const httpException = this.toHttpException(exception);
    const status = httpException.getStatus();

    response.status(status).json({
      statusCode: status,
      message: httpException.message,
      error: httpException.name,
      path: request.url,
      timestamp: new Date().toISOString(),
    });

    const meta = {
      prismaCode: exception.code,
      method: request.method,
      url: request.url,
      statusCode: status,
      message: httpException.message,
    };

    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error({ ...meta, err: exception }, 'prisma request failed');
      Sentry.captureException(exception, {
        mechanism: { handled: true, type: 'nestjs.prisma_exception_filter' },
      });
    } else {
      this.logger.warn(meta, 'prisma request rejected');
    }
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
