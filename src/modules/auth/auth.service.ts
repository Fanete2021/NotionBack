import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UsersRepository } from '@modules/users/users.repository';
import { UsersMapper } from '@modules/users/users.mapper';
import { UserEntity } from '@modules/users/user.entity';
import * as bcrypt from 'bcrypt';
import {
  TokenData,
  TokenPair,
  RefreshData,
  RevokeData,
} from '@modules/auth/types';
import { TokenService } from '@modules/auth/token.service';
import {
  LoginData,
  LogoutData,
  LogoutResult,
  RegisterData,
} from '@modules/auth/types';
import { CreateUserData } from '@modules/users/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersMapper: UsersMapper,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
  ) {}

  async register(data: RegisterData): Promise<TokenPair> {
    const existingUser = await this.usersRepository.findByEmail(data.email);
    if (existingUser) {
      this.logger.warn(
        { action: 'user_register', reason: 'email_already_exists' },
        'registration rejected',
      );
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10);
    const passwordHash = await bcrypt.hash(data.password, saltRounds);
    this.logger.debug({ action: 'user_register' }, 'password hashed');

    const createUserData: CreateUserData = {
      email: data.email,
      name: data.name,
      avatarUrl: data.avatarUrl,
      passwordHash,
    };
    const user = await this.usersRepository.create(createUserData);

    const tokenData: TokenData = {
      userId: user.id,
      email: user.email,
      rememberMe: true,
    };
    const tokens = await this.tokenService.generateTokens(tokenData);

    this.logger.info(
      { userId: user.id, action: 'user_register' },
      'user registered',
    );

    return tokens;
  }

  async login(data: LoginData): Promise<TokenPair> {
    const user = await this.usersRepository.findByEmail(data.email);
    if (!user) {
      this.logger.warn(
        { action: 'user_login', reason: 'invalid_credentials' },
        'login failed',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      this.logger.warn(
        {
          userId: user.id,
          action: 'user_login',
          reason: 'invalid_credentials',
        },
        'login failed',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokenData: TokenData = {
      userId: user.id,
      email: user.email,
      rememberMe: data.rememberMe ?? false,
    };
    const tokens = await this.tokenService.generateTokens(tokenData);

    this.logger.info(
      { userId: user.id, action: 'user_login' },
      'login success',
    );

    return tokens;
  }

  async getProfile(userId: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.usersMapper.toEntity(user);
  }

  async refresh(data: RefreshData): Promise<TokenPair> {
    try {
      const refreshSession = await this.tokenService.validateRefreshToken(
        data.token,
      );
      const user = await this.usersRepository.findById(refreshSession.userId);
      if (!user) {
        this.logger.warn(
          {
            userId: refreshSession.userId,
            action: 'tokens_refresh',
            reason: 'user_not_found',
          },
          'token refresh rejected',
        );
        throw new UnauthorizedException('User not found');
      }

      const tokenData: TokenData = {
        userId: user.id,
        email: user.email,
        rememberMe: refreshSession.rememberMe,
      };
      const tokens = await this.tokenService.generateTokens(tokenData);

      this.logger.info(
        { userId: user.id, action: 'tokens_refresh' },
        'tokens refreshed',
      );

      return tokens;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        { action: 'tokens_refresh', err: error },
        'token refresh failed',
      );
      throw error;
    }
  }

  async logout(data: LogoutData): Promise<LogoutResult> {
    if (data.token) {
      const tokenUserId = this.tokenService.getTokenUserId(data.token);
      if (tokenUserId !== data.userId) {
        this.logger.warn(
          {
            userId: data.userId,
            action: 'user_logout',
            reason: 'token_user_mismatch',
          },
          'logout rejected',
        );
        throw new UnauthorizedException('Invalid refresh token');
      }
    }

    const revokeData: RevokeData = {
      userId: data.userId,
      token: data.token,
    };
    await this.tokenService.revokeToken(revokeData);

    this.logger.info(
      { userId: data.userId, action: 'user_logout' },
      'logout success',
    );

    return { message: 'Logged out successfully' };
  }
}
