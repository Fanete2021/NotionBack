import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionsFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ValidationPipe } from '@nestjs/common';

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
    `/${GLOBAL_PREFIX}/pages/:id/content`,
    express.json({ limit: maxPageContentBytes * 2 }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);
  SwaggerModule.setup('docs', app, documentFactory, { useGlobalPrefix: true });

  const port = configService.get<number>('PORT', 8000);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
