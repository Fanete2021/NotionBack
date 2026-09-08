import type { Response } from 'express';
import {
  COOKIE_NAMES,
  REFRESH_COOKIE_OPTIONS,
} from '../constants';
import { SameSite } from '../types';

function setRefreshTokenCookie(
  res: Response,
  token: string,
  maxAgeSeconds: number,
  secure: boolean,
  sameSite: SameSite,
): void {
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, token, {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: maxAgeSeconds * 1000,
    secure,
    sameSite,
  });
}

export { setRefreshTokenCookie };
