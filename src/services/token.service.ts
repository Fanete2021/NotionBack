import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import ms from 'ms';
import type { StringValue } from 'ms';
import { TokenData } from 'src/types/auth/token.types';
import { RefreshTokenPayload } from 'src/types/auth/payload.types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async generateTokens(data: TokenData) {
    const accessPayload = { sub: data.userId, email: data.email };
    const accessExpiresIn = this.configService.get<StringValue>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresIn,
    });

    const refreshTokenId = `${data.userId}:${Date.now()}`;
    const refreshExpiresIn = this.configService.get<StringValue>(
      'JWT_REFRESH_EXPIRES_IN',
      '30d',
    );
    const refreshPayload = {
      sub: data.userId,
      email: data.email,
      jti: refreshTokenId,
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn,
    });

    await this.redis.sadd(`refresh_token:${data.userId}`, refreshTokenId);
    const refreshExpiresInSeconds = ms(refreshExpiresIn) / 1000;
    await this.redis.expire(
      `refresh_token:${data.userId}`,
      refreshExpiresInSeconds,
    );

    return {
      accessToken,
      refreshToken,
      user: { id: data.userId, email: data.email },
    };
  }

  async validateRefreshToken(token: string) {
    const decodedRefreshToken: RefreshTokenPayload = this.jwtService.verify(
      token,
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      },
    );

    const refreshTokenId = decodedRefreshToken.jti as string | undefined;
    if (!refreshTokenId) {
      throw new Error('Invalid refresh token');
    }

    const isTokenValid = await this.redis.sismember(
      `refresh_token:${decodedRefreshToken.sub}`,
      refreshTokenId,
    );

    if (!isTokenValid) {
      throw new Error('Invalid refresh token');
    }

    await this.redis.srem(
      `refresh_token:${decodedRefreshToken.sub}`,
      refreshTokenId,
    );

    return {
      userId: decodedRefreshToken.sub,
      refreshTokenId,
    };
  }

  getTokenUserId(token: string) {
    const decodedRefreshToken: RefreshTokenPayload = this.jwtService.verify(
      token,
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      },
    );

    return decodedRefreshToken.sub as string | undefined;
  }

  async revokeToken(userId: string, token?: string) {
    if (token) {
      await this.redis.srem(`refresh_token:${userId}`, token);
    } else {
      await this.redis.del(`refresh_token:${userId}`);
    }
  }
}
