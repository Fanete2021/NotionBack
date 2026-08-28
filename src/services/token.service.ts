import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import {
  RevokeData,
  TokenData,
  RefreshTokenPayload,
} from '../types/token/token.types';

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

    const sessionSetKey = this.userSessionsKey(data.userId);
    await this.redis.set(
      this.refreshTokenKey(data.userId, refreshTokenId),
      '1',
      'EX',
      refreshExpiresIn,
    );
    await this.redis.sadd(sessionSetKey, refreshTokenId);
    await this.redis.expire(sessionSetKey, refreshExpiresIn);

    return {
      accessToken,
      refreshToken,
      user: { id: data.userId, email: data.email },
    };
  }

  async validateRefreshToken(token: string) {
    const decodedRefreshToken = this.verifyRefreshPayload(token);

    const refreshTokenId = decodedRefreshToken.jti;
    if (!refreshTokenId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const redisKey = this.refreshTokenKey(
      decodedRefreshToken.sub,
      refreshTokenId,
    );
    const isTokenValid = await this.redis.exists(redisKey);

    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.redis.del(redisKey);
    await this.redis.srem(
      this.userSessionsKey(decodedRefreshToken.sub),
      refreshTokenId,
    );

    return {
      userId: decodedRefreshToken.sub,
      refreshTokenId,
    };
  }

  getTokenUserId(token: string) {
    return this.verifyRefreshPayload(token).sub;
  }

  async revokeToken(data: RevokeData) {
    const sessionSetKey = this.userSessionsKey(data.userId);

    if (data.token) {
      try {
        const decodedRefreshToken = this.verifyRefreshPayload(data.token);

        if (decodedRefreshToken.jti) {
          await this.redis.del(
            this.refreshTokenKey(data.userId, decodedRefreshToken.jti),
          );
          await this.redis.srem(sessionSetKey, decodedRefreshToken.jti);
        }
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          return;
        }
        throw error;
      }
    } else {
      const sessionIds = await this.redis.smembers(sessionSetKey);
      if (sessionIds.length > 0) {
        await this.redis.del(
          ...sessionIds.map((id) => this.refreshTokenKey(data.userId, id)),
        );
      }
      await this.redis.del(sessionSetKey);
    }
  }

  private verifyRefreshPayload(token: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private refreshTokenKey(userId: string, tokenId: string): string {
    return `refresh_token:${userId}:${tokenId}`;
  }

  private userSessionsKey(userId: string): string {
    return `user_sessions:${userId}`;
  }
}
