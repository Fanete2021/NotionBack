import type { Response } from 'express';
import {
  COOKIE_NAMES,
  REFRESH_COOKIE_OPTIONS,
} from '../constants';
import { SameSite } from '../types';

function clearRefreshTokenCookie(
  res: Response,
  secure: boolean,
  sameSite: SameSite,
): void {
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
    ...REFRESH_COOKIE_OPTIONS,
    secure,
    sameSite,
  });
}

export { clearRefreshTokenCookie };
