import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Redis } from 'ioredis';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth & Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://postgres:postgres@localhost:5432/notionback?schema=public';
    process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    const redis = app.get<Redis>('REDIS_CLIENT');
    await redis.quit();
    await app.get(PrismaService).$disconnect();
    await app.close();
  });

  it('GET /api/health доступен без токена', () => {
    return request(app.getHttpServer() as App)
      .get('/api/health')
      .expect(HttpStatus.OK)
      .expect((res: { body: { status: string } }) => {
        expect(res.body.status).toBe('ok');
      });
  });

  it('GET /api/auth/me без токена возвращает 401, а не 500', () => {
    return request(app.getHttpServer() as App)
      .get('/api/auth/me')
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
