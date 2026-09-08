import type { Response } from 'express';
import {
  COOKIE_NAMES,
  REFRESH_COOKIE_OPTIONS,
} from '@common/constants';
import { setRefreshTokenCookie } from '.';

describe('setRefreshTokenCookie', () => {
  const cookie = jest.fn();
  const res = { cookie } as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ставит refresh cookie с базовыми опциями и maxAge в миллисекундах', () => {
    setRefreshTokenCookie(res, 'refresh.jwt', 2592000, false, 'lax');

    expect(cookie).toHaveBeenCalledTimes(1);
    expect(cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      'refresh.jwt',
      {
        ...REFRESH_COOKIE_OPTIONS,
        maxAge: 2592000 * 1000,
        secure: false,
        sameSite: 'lax',
      },
    );
  });

  it('прокидывает secure: true и sameSite: none для кросс-сайта', () => {
    setRefreshTokenCookie(res, 'refresh.jwt', 60, true, 'none');

    expect(cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      'refresh.jwt',
      expect.objectContaining({ secure: true, sameSite: 'none', maxAge: 60000 }),
    );
  });

  it('прокидывает sameSite: strict', () => {
    setRefreshTokenCookie(res, 'token', 3600, true, 'strict');

    expect(cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      'token',
      expect.objectContaining({ sameSite: 'strict' }),
    );
  });
});
