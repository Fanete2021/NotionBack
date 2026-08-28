import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from '../repositories/users.repository';
import * as bcrypt from 'bcrypt';
import { TokenData, RefreshData, RevokeData } from '../types/token/token.types';
import { TokenService } from './token.service';
import { LoginData, LogoutData, RegisterData } from '../types/auth/auth.types';
import { CreateUserData } from '../types/users/users.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async register(data: RegisterData) {
    const existingUser = await this.usersRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10);
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const createUserData: CreateUserData = {
      email: data.email,
      name: data.name,
      avatarUrl: data.avatarUrl,
      passwordHash,
    };
    const user = await this.usersRepository.create(createUserData);

    const tokenData: TokenData = { userId: user.id, email: user.email };
    return this.tokenService.generateTokens(tokenData);
  }

  async login(data: LoginData) {
    const user = await this.usersRepository.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokenData: TokenData = { userId: user.id, email: user.email };
    return this.tokenService.generateTokens(tokenData);
  }

  async refresh(data: RefreshData) {
    try {
      const refreshSession = await this.tokenService.validateRefreshToken(
        data.token,
      );
      const user = await this.usersRepository.findById(refreshSession.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokenData: TokenData = { userId: user.id, email: user.email };
      return this.tokenService.generateTokens(tokenData);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        'Failed to refresh tokens',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async logout(data: LogoutData) {
    if (data.token) {
      const tokenUserId = this.tokenService.getTokenUserId(data.token);
      if (tokenUserId !== data.userId) {
        throw new UnauthorizedException('Invalid refresh token');
      }
    }

    const revokeData: RevokeData = {
      userId: data.userId,
      token: data.token,
    };
    await this.tokenService.revokeToken(revokeData);
    return { message: 'Logged out successfully' };
  }
}
