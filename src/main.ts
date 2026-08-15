import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionsFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',');

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Глобальная рамка body-parser: дефолт Express (100 KB) не пропускает
  // контент страниц. Ставим 2× лимит контента, точный лимит (Buffer.byteLength)
  // проверяется в PagesService.updateContent. Это ослабляет общий лимит тела для
  // всех JSON-роутов (register/login и пр.), поэтому держим множитель минимальным.
  const maxPageContentBytes = configService.get<number>(
    'MAX_PAGE_CONTENT_BYTES',
    1048576,
  );
  app.useBodyParser('json', { limit: maxPageContentBytes * 2 });

  app.useGlobalFilters(new PrismaExceptionFilter(), new HttpExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

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
