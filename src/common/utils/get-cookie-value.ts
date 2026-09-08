import type { Request } from 'express';
import { CookieName } from '../types/cookie.types';

function getCookieValue(
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

export { getCookieValue };
