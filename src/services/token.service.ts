import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import {
  RevokeData,
  TokenData,
  RefreshTokenPayload,
} from 'src/types/token/token.types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async generateTokens(data: TokenData) {
    const accessPayload = { sub: data.userId, email: data.email };
    const accessExpiresIn = this.configService.get<number>(
      'JWT_ACCESS_EXPIRES_IN',
      900, // 15 минут в секундах
    );
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresIn,
    });

    const refreshTokenId = `${data.userId}:${Date.now()}`;
    const refreshExpiresIn = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN',
      2592000, // 30 дней в секундах
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

    const key = `refresh_token:${data.userId}:${refreshTokenId}`;
    await this.redis.set(key, '1', 'EX', refreshExpiresIn);

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

    const redisKey = `refresh_token:${decodedRefreshToken.sub}:${refreshTokenId}`;
    const isTokenValid = await this.redis.exists(redisKey);

    if (!isTokenValid) {
      throw new Error('Invalid refresh token');
    }

    await this.redis.del(redisKey);

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

  async revokeToken(data: RevokeData) {
    if (data.token) {
      try {
        const decodedRefreshToken = this.jwtService.verify<RefreshTokenPayload>(
          data.token,
          {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          },
        );

        if (decodedRefreshToken.jti) {
          await this.redis.del(
            `refresh_token:${data.userId}:${decodedRefreshToken.jti}`,
          );
        }
      } catch {
        // Токен уже невалиден или истек
      }
    } else {
      const keys = await this.redis.keys(`refresh_token:${data.userId}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}
