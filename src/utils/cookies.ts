import type { Request, Response } from 'express';

export const COOKIE_NAMES = {
  REFRESH_TOKEN: 'refreshToken',
} as const;

export type CookieName = (typeof COOKIE_NAMES)[keyof typeof COOKIE_NAMES];

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'none' as const,
  path: '/',
};

export function getCookieValue(
  req: Request | { headers?: { cookie?: string } },
  cookieName: CookieName,
): string | undefined {
  const cookies = req.headers?.cookie;
  if (!cookies) {
    return undefined;
  }

  const cookieEntries = cookies.split(';').map((cookie) => cookie.trim());
  const targetCookie = cookieEntries.find((cookie) =>
    cookie.startsWith(`${cookieName}=`),
  );

  return targetCookie
    ? decodeURIComponent(targetCookie.split('=')[1])
    : undefined;
}

export function setRefreshTokenCookie(
  res: Response,
  token: string,
  maxAgeSeconds: number,
  secure: boolean,
): void {
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, token, {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: maxAgeSeconds * 1000,
    secure,
  });
}

export function clearRefreshTokenCookie(res: Response, secure: boolean): void {
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
    ...REFRESH_COOKIE_OPTIONS,
    secure,
  });
}
