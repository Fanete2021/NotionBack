import type { Response } from 'express';
import { COOKIE_NAMES, REFRESH_COOKIE_OPTIONS } from '@common/constants';
import { SameSite } from '@common/types';

interface SetRefreshTokenParams {
  res: Response;
  token: string;
  maxAgeSeconds: number | null;
  secure: boolean;
  sameSite: SameSite;
}

function setRefreshTokenCookie(params: SetRefreshTokenParams): void {
  const { res, token, maxAgeSeconds, secure, sameSite } = params;
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, token, {
    ...REFRESH_COOKIE_OPTIONS,
    ...(maxAgeSeconds != null && { maxAge: maxAgeSeconds * 1000 }),
    secure,
    sameSite,
  });
}

export { setRefreshTokenCookie };
