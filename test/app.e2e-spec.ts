import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import type { App } from 'supertest/types';
import { HealthController } from '../src/controllers/health.controller';
import { AuthController } from '../src/controllers/auth.controller';
import { AuthService } from '../src/services/auth.service';
import { JwtAuthGuard } from '../src/guards/jwt-auth.guard';
import { AccessStrategy } from '../src/strategies/access.strategy';
import { RefreshStrategy } from '../src/strategies/refresh.strategy';

describe('Auth & Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            (): Record<string, string | number | boolean> => ({
              JWT_ACCESS_SECRET: 'test-access-secret',
              JWT_REFRESH_SECRET: 'test-refresh-secret',
              JWT_REFRESH_EXPIRES_IN: 2592000,
              COOKIE_SECURE: false,
            }),
          ],
        }),
        PassportModule.register({}),
      ],
      controllers: [HealthController, AuthController],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        AccessStrategy,
        RefreshStrategy,
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
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
