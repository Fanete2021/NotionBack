import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserPayload } from '../../../common/types';
import { TokenPayload } from '../types';
import type { Request } from 'express';
import { COOKIE_NAMES } from '../../../common/constants';
import { getCookieValue } from '../../../common/utils';
import { mapTokenPayloadToUser } from '../utils';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request): string | null => {
        const refreshToken = getCookieValue(req, COOKIE_NAMES.REFRESH_TOKEN);
        return refreshToken ?? null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  validate(payload: TokenPayload): UserPayload {
    return mapTokenPayloadToUser(payload);
  }
}
