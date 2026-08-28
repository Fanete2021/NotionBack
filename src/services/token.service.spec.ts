import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const values: Record<string, unknown> = {
        JWT_ACCESS_EXPIRES_IN: 900,
        JWT_REFRESH_EXPIRES_IN: 2592000,
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
      };
      return values[key] ?? defaultValue;
    }),
  };

  const mockRedis = {
    set: jest.fn(),
    sadd: jest.fn(),
    expire: jest.fn(),
    exists: jest.fn(),
    del: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    keys: jest.fn(),
  };

  const payload = {
    sub: 'user-1',
    email: 'test@test.com',
    jti: 'user-1:1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
      ],
    }).compile();

    service = module.get(TokenService);
  });

  describe('generateTokens', () => {
    it('сохраняет refresh-токен и id сессии в SET, без KEYS', async () => {
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.generateTokens({
        userId: 'user-1',
        email: 'test@test.com',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-1', email: 'test@test.com' },
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh_token:user-1:/),
        '1',
        'EX',
        2592000,
      );
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        'user_sessions:user-1',
        expect.any(String),
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'user_sessions:user-1',
        2592000,
      );
      expect(mockRedis.keys).not.toHaveBeenCalled();
    });
  });

  describe('validateRefreshToken', () => {
    it('возвращает сессию и удаляет ключи при валидном токене', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      mockRedis.exists.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);
      mockRedis.srem.mockResolvedValue(1);

      await expect(
        service.validateRefreshToken('refresh.jwt'),
      ).resolves.toEqual({
        userId: 'user-1',
        refreshTokenId: 'user-1:1',
      });

      expect(mockRedis.del).toHaveBeenCalledWith(
        'refresh_token:user-1:user-1:1',
      );
      expect(mockRedis.srem).toHaveBeenCalledWith(
        'user_sessions:user-1',
        'user-1:1',
      );
    });

    it('бросает UnauthorizedException при невалидной подписи JWT', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.validateRefreshToken('bad.jwt')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRedis.exists).not.toHaveBeenCalled();
    });

    it('бросает UnauthorizedException, если токена нет в Redis', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      mockRedis.exists.mockResolvedValue(0);

      await expect(service.validateRefreshToken('refresh.jwt')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('пробрасывает ошибку Redis, не превращая её в 401', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      const redisError = new Error('Redis connection refused');
      mockRedis.exists.mockRejectedValue(redisError);

      await expect(service.validateRefreshToken('refresh.jwt')).rejects.toThrow(
        redisError,
      );
    });
  });

  describe('revokeToken', () => {
    it('отзывает одну сессию по токену', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      mockRedis.del.mockResolvedValue(1);
      mockRedis.srem.mockResolvedValue(1);

      await service.revokeToken({ userId: 'user-1', token: 'refresh.jwt' });

      expect(mockRedis.del).toHaveBeenCalledWith(
        'refresh_token:user-1:user-1:1',
      );
      expect(mockRedis.srem).toHaveBeenCalledWith(
        'user_sessions:user-1',
        'user-1:1',
      );
      expect(mockRedis.keys).not.toHaveBeenCalled();
    });

    it('отзывает все сессии через SET, без KEYS', async () => {
      mockRedis.smembers.mockResolvedValue(['user-1:1', 'user-1:2']);
      mockRedis.del.mockResolvedValue(1);

      await service.revokeToken({ userId: 'user-1' });

      expect(mockRedis.smembers).toHaveBeenCalledWith('user_sessions:user-1');
      expect(mockRedis.del).toHaveBeenCalledWith(
        'refresh_token:user-1:user-1:1',
        'refresh_token:user-1:user-1:2',
      );
      expect(mockRedis.del).toHaveBeenCalledWith('user_sessions:user-1');
      expect(mockRedis.keys).not.toHaveBeenCalled();
    });

    it('пробрасывает ошибку Redis при отзыве всех сессий', async () => {
      const redisError = new Error('Redis connection refused');
      mockRedis.smembers.mockRejectedValue(redisError);

      await expect(service.revokeToken({ userId: 'user-1' })).rejects.toThrow(
        redisError,
      );
    });
  });
});
