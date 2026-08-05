import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
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
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
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

      mockUsersService.findByEmail.mockResolvedValue(fakeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('fake_access_token');
      mockConfigService.get.mockReturnValue(3600);

      const result = await authService.login(loginDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        fakeUser.passwordHash,
      );
      expect(mockRedisClient.sadd).toHaveBeenCalled();
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

      mockUsersService.findByEmail.mockResolvedValue(fakeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRedisClient.sadd).not.toHaveBeenCalled();
    });

    it('должен выбрасывать ошибку UnauthorizedException, если пользователь не найден', async () => {
      const loginDto = { email: 'notfound@test.com', password: 'password123' };

      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockRedisClient.sadd).not.toHaveBeenCalled();
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

      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockUsersService.createUser.mockResolvedValue(fakeUser);
      mockJwtService.sign.mockReturnValue('fake_access');
      mockConfigService.get.mockReturnValue(10);

      const result = await authService.register(registerDto);

      expect(mockUsersService.createUser).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken', 'fake_access');
    });

    it('должен выбрасывать ConflictException, если email занят', async () => {
      const registerDto = {
        email: 'exist@test.com',
        password: 'pass',
        name: 'Exist',
      };

      mockUsersService.findByEmail.mockResolvedValue({ id: '1' });

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUsersService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('должен выдавать новые токены при валидном refresh токене', async () => {
      const userId = '123';
      const oldToken = 'old-uuid';
      const fakeUser = { id: userId, email: 'test@test.com' };

      mockRedisClient.sismember.mockResolvedValue(1);
      mockUsersService.findById.mockResolvedValue(fakeUser);
      mockJwtService.sign.mockReturnValue('new_access');

      const result = await authService.refresh(userId, oldToken);

      expect(mockRedisClient.srem).toHaveBeenCalledWith(
        `refresh_token:${userId}`,
        oldToken,
      );
      expect(result).toHaveProperty('accessToken', 'new_access');
      expect(result).toHaveProperty('refreshToken');
    });

    it('должен выбрасывать UnauthorizedException, если токена нет в Redis', async () => {
      mockRedisClient.sismember.mockResolvedValue(0);

      await expect(authService.refresh('123', 'bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRedisClient.srem).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('должен удалять конкретный токен, если он передан (одно устройство)', async () => {
      await authService.logout('123', 'some-token');
      expect(mockRedisClient.srem).toHaveBeenCalledWith(
        'refresh_token:123',
        'some-token',
      );
    });

    it('должен удалять весь ключ, если токен не передан (все устройства)', async () => {
      await authService.logout('123');
      expect(mockRedisClient.del).toHaveBeenCalledWith('refresh_token:123');
    });
  });
});
