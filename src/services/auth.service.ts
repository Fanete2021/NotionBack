import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Redis } from 'ioredis';
import { TokenData } from 'src/types/auth/token.types';
import {
  CreateUserData,
  LoginData,
  LogoutData,
  RefreshData,
  RegisterData,
} from 'src/types/auth/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private async generateTokens(data: TokenData) {
    const payload = { sub: data.userId, email: data.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    const refreshExpiresIn = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN',
      2592000,
    );
    await this.redis.sadd(`refresh_token:${data.userId}`, refreshToken);
    await this.redis.expire(`refresh_token:${data.userId}`, refreshExpiresIn);

    return {
      accessToken,
      refreshToken,
      user: { id: data.userId, email: data.email },
    };
  }

  async register(data: RegisterData) {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10);
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const createUserData: CreateUserData = { ...data, passwordHash };
    const user = await this.usersService.createUser(createUserData);

    const tokenData: TokenData = { userId: user.id, email: user.email };
    return this.generateTokens(tokenData);
  }

  async login(data: LoginData) {
    const user = await this.usersService.findByEmail(data.email);
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
    return this.generateTokens(tokenData);
  }

  async refresh(data: RefreshData) {
    const isTokenValid = await this.redis.sismember(
      `refresh_token:${data.userId}`,
      data.oldRefreshToken,
    );

    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.redis.srem(`refresh_token:${data.userId}`, data.oldRefreshToken);

    const user = await this.usersService.findById(data.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokenData: TokenData = { userId: user.id, email: user.email };
    return this.generateTokens(tokenData);
  }

  async logout(data: LogoutData) {
    if (data.refreshToken) {
      await this.redis.srem(`refresh_token:${data.userId}`, data.refreshToken);
    } else {
      await this.redis.del(`refresh_token:${data.userId}`);
    }
    return { message: 'Logged out successfully' };
  }
}
