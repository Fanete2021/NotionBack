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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    const refreshExpiresIn = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN',
      2592000,
    );

    await this.redis.sadd(`refresh_token:${userId}`, refreshToken);
    await this.redis.expire(`refresh_token:${userId}`, refreshExpiresIn);

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email },
    };
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    avatarUrl?: string;
  }) {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRoundsStr = this.configService.get<string>(
      'BCRYPT_SALT_ROUNDS',
      '10',
    );
    const saltRounds = parseInt(saltRoundsStr.toString(), 10);
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const user = await this.usersService.createUser({
      email: data.email,
      passwordHash: passwordHash,
      name: data.name,
      avatarUrl: data.avatarUrl,
    });

    return this.generateTokens(user.id, user.email);
  }

  async login(data: { email: string; password: string }) {
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

    return this.generateTokens(user.id, user.email);
  }

  async refresh(userId: string, oldRefreshToken: string) {
    const isTokenValid = await this.redis.sismember(
      `refresh_token:${userId}`,
      oldRefreshToken,
    );

    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.redis.srem(`refresh_token:${userId}`, oldRefreshToken);

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user.id, user.email);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.redis.srem(`refresh_token:${userId}`, refreshToken);
    } else {
      await this.redis.del(`refresh_token:${userId}`);
    }
    return { message: 'Logged out successfully' };
  }
}
