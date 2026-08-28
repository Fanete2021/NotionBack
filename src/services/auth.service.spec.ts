import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersRepository } from '../repositories/users.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TokenService } from './token.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;

  const mockUsersRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockTokenService = {
    generateTokens: jest.fn(),
    validateRefreshToken: jest.fn(),
    getTokenUserId: jest.fn(),
    revokeToken: jest.fn(),
  };

  const mockRedisClient = {
    sadd: jest.fn(),
    expire: jest.fn(),
    sismember: jest.fn(),
    srem: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: 'REDIS_CLIENT', useValue: mockRedisClient },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('login', () => {
    it('должен успешно логинить пользователя и возвращать токены', async () => {
      const loginDto = { email: 'test@test.com', password: 'password123' };
      const fakeUser = {
        id: '123',
        email: 'test@test.com',
        passwordHash: 'hashedPass',
      };

      mockUsersRepository.findByEmail.mockResolvedValue(fakeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'fake_access_token',
        refreshToken: 'fake_refresh_token',
        user: { id: '123', email: 'test@test.com' },
      });

      const result = await authService.login(loginDto);

      expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith(
        loginDto.email,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        fakeUser.passwordHash,
      );
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith({
        userId: '123',
        email: 'test@test.com',
      });
      expect(result).toHaveProperty('accessToken', 'fake_access_token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({ id: '123', email: 'test@test.com' });
    });

    it('должен выбрасывать ошибку UnauthorizedException при неверном пароле', async () => {
      const loginDto = { email: 'test@test.com', password: 'wrongPassword' };
      const fakeUser = {
        id: '123',
        email: 'test@test.com',
        passwordHash: 'hashedPass',
      };

      mockUsersRepository.findByEmail.mockResolvedValue(fakeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('должен выбрасывать ошибку UnauthorizedException, если пользователь не найден', async () => {
      const loginDto = { email: 'notfound@test.com', password: 'password123' };

      mockUsersRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('должен успешно регистрировать пользователя', async () => {
      const registerDto = {
        email: 'new@test.com',
        password: 'pass',
        name: 'New User',
      };
      const fakeUser = {
        id: '123',
        email: registerDto.email,
        passwordHash: 'hashed',
        name: registerDto.name,
      };

      mockUsersRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockUsersRepository.create.mockResolvedValue(fakeUser);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'fake_access',
        refreshToken: 'fake_refresh',
        user: { id: '123', email: registerDto.email },
      });

      const result = await authService.register(registerDto);

      expect(mockUsersRepository.create).toHaveBeenCalled();
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith({
        userId: '123',
        email: registerDto.email,
      });
      expect(result).toHaveProperty('accessToken', 'fake_access');
    });

    it('должен выбрасывать ConflictException, если email занят', async () => {
      const registerDto = {
        email: 'exist@test.com',
        password: 'pass',
        name: 'Exist',
      };

      mockUsersRepository.findByEmail.mockResolvedValue({ id: '1' });

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUsersRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('должен выдавать новые токены при валидном refresh токене', async () => {
      const userId = '123';
      const tokenId = 'refresh-jti';
      const refreshToken = 'refresh.jwt.token';
      const fakeUser = { id: userId, email: 'test@test.com' };

      mockTokenService.validateRefreshToken.mockResolvedValue({
        userId,
        refreshTokenId: tokenId,
      });
      mockUsersRepository.findById.mockResolvedValue(fakeUser);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
        user: { id: userId, email: fakeUser.email },
      });

      const result = await authService.refresh({ token: refreshToken });

      expect(mockTokenService.validateRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
      expect(result).toHaveProperty('accessToken', 'new_access');
      expect(result).toHaveProperty('refreshToken');
    });

    it('должен выбрасывать UnauthorizedException, если токена нет в Redis', async () => {
      mockTokenService.validateRefreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(
        authService.refresh({ token: 'bad-refresh-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('должен выбрасывать UnauthorizedException, если пользователь не найден', async () => {
      mockTokenService.validateRefreshToken.mockResolvedValue({
        userId: '123',
        refreshTokenId: 'refresh-jti',
      });
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(
        authService.refresh({ token: 'refresh.jwt.token' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
    });

    it('не маскирует сбой инфраструктуры как Invalid refresh token', async () => {
      const redisError = new Error('Redis connection refused');
      mockTokenService.validateRefreshToken.mockRejectedValue(redisError);
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      await expect(
        authService.refresh({ token: 'refresh.jwt.token' }),
      ).rejects.toThrow(redisError);

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('logout', () => {
    it('должен удалять конкретный токен, если он передан (одно устройство)', async () => {
      mockTokenService.getTokenUserId.mockReturnValue('123');

      await authService.logout({ userId: '123', token: 'some-token' });

      expect(mockTokenService.getTokenUserId).toHaveBeenCalledWith(
        'some-token',
      );
      expect(mockTokenService.revokeToken).toHaveBeenCalledWith({
        userId: '123',
        token: 'some-token',
      });
    });

    it('должен выбрасывать UnauthorizedException, если токен принадлежит другому пользователю', async () => {
      mockTokenService.getTokenUserId.mockReturnValue('456');

      await expect(
        authService.logout({ userId: '123', token: 'some-token' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTokenService.revokeToken).not.toHaveBeenCalled();
    });

    it('должен удалять весь ключ, если токен не передан (все устройства)', async () => {
      await authService.logout({ userId: '123' });
      expect(mockTokenService.revokeToken).toHaveBeenCalledWith({
        userId: '123',
        token: undefined,
      });
    });
  });
});
