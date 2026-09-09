const COOKIE_NAMES = {
  REFRESH_TOKEN: 'refreshToken',
} as const;

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
};

export { COOKIE_NAMES, REFRESH_COOKIE_OPTIONS };
