import { COOKIE_NAMES } from '../constants/cookie.constants';

type CookieName = (typeof COOKIE_NAMES)[keyof typeof COOKIE_NAMES];

type SameSite = 'none' | 'lax' | 'strict';

export type { CookieName, SameSite };
