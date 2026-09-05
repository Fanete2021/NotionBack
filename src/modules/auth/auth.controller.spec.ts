import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const values: Record<string, unknown> = {
        JWT_REFRESH_EXPIRES_IN: 2592000,
        COOKIE_SECURE: false,
        COOKIE_SAME_SITE: 'lax',
      };
      return values[key] ?? defaultValue;
    }),
  };

  const cookie = jest.fn();
  const clearCookie = jest.fn();
  const res = { cookie, clearCookie } as unknown as Response;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('register отдаёт токены и ставит cookie', async () => {
    mockAuthService.register.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: { id: '1', email: 'user@test.com' },
    });

    const result = await controller.register(
      {
        email: 'user@test.com',
        password: 'password123',
        name: 'User',
      },
      res,
    );

    expect(mockAuthService.register).toHaveBeenCalled();
    expect(cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        secure: false,
        sameSite: 'lax',
        maxAge: 2592000 * 1000,
      }),
    );
    expect(result).toEqual({
      accessToken: 'access',
      user: { id: '1', email: 'user@test.com' },
    });
  });

  it('login ставит cookie с теми же sameSite и secure, что и register', async () => {
    mockAuthService.login.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: { id: '1', email: 'user@test.com' },
    });

    await controller.login(
      { email: 'user@test.com', password: 'password123' },
      res,
    );

    expect(cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh',
      expect.objectContaining({
        secure: false,
        sameSite: 'lax',
      }),
    );
  });

  it('getProfile возвращает пользователя из запроса', () => {
    const req = {
      user: { id: '1', email: 'user@test.com' },
    } as unknown as Request;

    expect(controller.getProfile(req)).toEqual({
      id: '1',
      email: 'user@test.com',
    });
  });

  it('logout без cookie и allDevices бросает 401', async () => {
    const req = {
      user: { id: '1', email: 'user@test.com' },
      headers: {},
    } as unknown as Request;

    await expect(
      controller.logout(req, res, { allDevices: false }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockAuthService.logout).not.toHaveBeenCalled();
    expect(clearCookie).not.toHaveBeenCalled();
  });

  it('logout чистит cookie с теми же secure и sameSite, что ставил login', async () => {
    mockAuthService.logout.mockResolvedValue({
      message: 'Logged out successfully',
    });

    const req = {
      user: { id: '1', email: 'user@test.com' },
      headers: { cookie: 'refreshToken=refresh.jwt' },
    } as unknown as Request;

    await controller.logout(req, res, { allDevices: false });

    expect(clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        secure: false,
        sameSite: 'lax',
      }),
    );
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});
