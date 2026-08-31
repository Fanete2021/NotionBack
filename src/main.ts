import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionsFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { PAGE_CONTENT_ROUTE } from './modules/pages/pages.routes';

const GLOBAL_PREFIX = 'api';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  const configService = app.get(ConfigService);

  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',');

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const maxPageContentBytes = configService.get<number>(
    'MAX_PAGE_CONTENT_BYTES',
    1048576,
  );

  // Большой лимит тела только для content-эндпоинта страниц, остальные
  // JSON-роуты остаются на дефолтном лимите express (100 KB).
  app.use(
    `/${GLOBAL_PREFIX}/${PAGE_CONTENT_ROUTE}`,
    express.json({ limit: maxPageContentBytes * 2 }),
  );
  app.use(express.json());

  const bodyParserErrorHandler: express.ErrorRequestHandler = (
    err,
    req,
    res,
    next,
  ) => {
    const error = err as { type?: string; status?: number } | undefined;
    if (error?.type === 'entity.too.large') {
      const status = error.status ?? 413;
      res.status(status).json({
        statusCode: status,
        message: 'Request body exceeds the size limit',
        error: 'PayloadTooLargeException',
        path: req.url,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next(err);
  };
  app.use(bodyParserErrorHandler);

  app.useGlobalFilters(new PrismaExceptionFilter(), new HttpExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix(GLOBAL_PREFIX);

  const config = new DocumentBuilder()
    .setTitle('Notion Alternative API')
    .setDescription('Документация REST API для проекта Notion Alternative')
    .setVersion('1.0')
    .addServer('http://localhost:8000', 'Локальный сервер')
    .addServer('https://api.notion-alt.ru', 'Продакшн сервер (пример)')
    .addBearerAuth()
    .addCookieAuth('refreshToken', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refreshToken',
    })
    .build();
  const documentFactory = (): OpenAPIObject =>
    SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);
  SwaggerModule.setup('docs', app, documentFactory, { useGlobalPrefix: true });

  const port = configService.get<number>('PORT', 8000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
