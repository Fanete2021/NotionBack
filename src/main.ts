import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionsFilter } from './config/http-exception';
import { PrismaExceptionFilter } from './config/prisma-exception.filter';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get<string>('FRONT_URL', 'http://localhost:3000'),
    credentials: true,
  });

  app.useGlobalFilters(new PrismaExceptionFilter(), new HttpExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('NotionBack API')
    .setDescription('Backend API for the Notion-clone project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory, { useGlobalPrefix: true });

  const port = configService.get<number>('PORT', 8000);
  await app.listen(port);
}
bootstrap();
