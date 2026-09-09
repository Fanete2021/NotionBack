import type { Response } from 'express';
import { COOKIE_NAMES, REFRESH_COOKIE_OPTIONS } from '@common/constants';
import { clearRefreshTokenCookie } from '.';

describe('clearRefreshTokenCookie', () => {
  const clearCookie = jest.fn();
  const res = { clearCookie } as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('чистит refresh cookie с базовыми опциями и переданными secure и sameSite', () => {
    clearRefreshTokenCookie(res, false, 'lax');

    expect(clearCookie).toHaveBeenCalledTimes(1);
    expect(clearCookie).toHaveBeenCalledWith(COOKIE_NAMES.REFRESH_TOKEN, {
      ...REFRESH_COOKIE_OPTIONS,
      secure: false,
      sameSite: 'lax',
    });
  });

  it('прокидывает secure: true и sameSite: none для кросс-сайта', () => {
    clearRefreshTokenCookie(res, true, 'none');

    expect(clearCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      expect.objectContaining({ secure: true, sameSite: 'none' }),
    );
  });

  it('прокидывает sameSite: strict', () => {
    clearRefreshTokenCookie(res, true, 'strict');

    expect(clearCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      expect.objectContaining({ sameSite: 'strict' }),
    );
  });
});
