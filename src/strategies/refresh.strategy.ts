import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserPayload, TokenPayload } from 'src/types/auth/payload.types';
import type { Request } from 'express';
import { getCookieValue } from '../utils/cookies';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => {
        const refreshToken = getCookieValue(req, 'refreshToken');
        return refreshToken ?? null;
      },
      ignoreExpiration: true,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
    });
  }

  validate(payload: TokenPayload): UserPayload {
    return { id: payload.sub, email: payload.email };
  }
}
