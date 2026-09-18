import type { Response } from 'express';
import { COOKIE_NAMES, REFRESH_COOKIE_OPTIONS } from '@common/constants';
import { setRefreshTokenCookie } from '.';

describe('setRefreshTokenCookie', () => {
  const cookie = jest.fn();
  const res = { cookie } as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ставит refresh cookie с базовыми опциями и maxAge в миллисекундах', () => {
    setRefreshTokenCookie({
      res,
      token: 'refresh.jwt',
      maxAgeSeconds: 2592000,
      secure: false,
      sameSite: 'lax',
    });

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

  it('ставит сессионную cookie без maxAge, когда maxAgeSeconds = null', () => {
    setRefreshTokenCookie({
      res,
      token: 'refresh.jwt',
      maxAgeSeconds: null,
      secure: false,
      sameSite: 'lax',
    });

    const calls = cookie.mock.calls as unknown as unknown[][];
    const options = calls[0][2] as Record<string, unknown>;
    expect(options).not.toHaveProperty('maxAge');
    expect(options).toMatchObject({ secure: false, sameSite: 'lax' });
  });

  it('прокидывает secure: true и sameSite: none для кросс-сайта', () => {
    setRefreshTokenCookie({
      res,
      token: 'refresh.jwt',
      maxAgeSeconds: 60,
      secure: true,
      sameSite: 'none',
    });

    expect(cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      'refresh.jwt',
      expect.objectContaining({
        secure: true,
        sameSite: 'none',
        maxAge: 60000,
      }),
    );
  });

  it('прокидывает sameSite: strict', () => {
    setRefreshTokenCookie({
      res,
      token: 'token',
      maxAgeSeconds: 3600,
      secure: true,
      sameSite: 'strict',
    });

    expect(cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      'token',
      expect.objectContaining({ sameSite: 'strict' }),
    );
  });
});
