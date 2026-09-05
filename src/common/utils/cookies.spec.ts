import {
  COOKIE_NAMES,
  clearRefreshTokenCookie,
  getCookieValue,
  setRefreshTokenCookie,
  CookieName,
} from './cookies';
import type { Request, Response } from 'express';

describe('getCookieValue', () => {
  it('should return undefined if headers are missing', () => {
    const req = {} as Request;
    expect(getCookieValue(req, 'testCookie' as CookieName)).toBeUndefined();
  });

  it('should return undefined if cookie header is missing', () => {
    const req = { headers: {} } as Request;
    expect(getCookieValue(req, 'testCookie' as CookieName)).toBeUndefined();
  });

  it('should return undefined if the cookie header is empty', () => {
    const req = { headers: { cookie: '' } } as Request;
    expect(getCookieValue(req, 'testCookie' as CookieName)).toBeUndefined();
  });

  it('should return undefined if the requested cookie is not found', () => {
    const req = {
      headers: { cookie: 'otherCookie=123; another=456' },
    } as Request;
    expect(getCookieValue(req, 'testCookie' as CookieName)).toBeUndefined();
  });

  it('should return the correct cookie value when it exists', () => {
    const req = {
      headers: { cookie: 'testCookie=value123; otherCookie=456' },
    } as Request;
    expect(getCookieValue(req, 'testCookie' as CookieName)).toBe('value123');
  });

  it('should handle cookies with extra whitespace correctly', () => {
    const req = {
      headers: {
        cookie: '  otherCookie=456  ;   testCookie=value123  ; another=789 ',
      },
    } as Request;
    expect(getCookieValue(req, 'testCookie' as CookieName)).toBe('value123');
  });

  it('should decode URI encoded cookie values', () => {
    const req = { headers: { cookie: 'testCookie=hello%20world' } } as Request;
    expect(getCookieValue(req, 'testCookie' as CookieName)).toBe('hello world');
  });

  it('should handle partial matches correctly (should not match if cookie name is just a substring of another)', () => {
    // If we look for 'test', it should NOT match 'mytestCookie=123'
    const req = {
      headers: { cookie: 'mytestCookie=123; test=correctValue' },
    } as Request;
    expect(getCookieValue(req, 'test' as CookieName)).toBe('correctValue');
  });

  it('should handle single cookie without semicolons', () => {
    const req = { headers: { cookie: 'testCookie=singleValue' } } as Request;
    expect(getCookieValue(req, 'testCookie' as CookieName)).toBe('singleValue');
  });
});

describe('setRefreshTokenCookie / clearRefreshTokenCookie', () => {
  const cookie = jest.fn();
  const clearCookie = jest.fn();
  const res = { cookie, clearCookie } as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ставит refresh cookie с переданными secure и sameSite', () => {
    setRefreshTokenCookie(res, 'refresh.jwt', 2592000, false, 'lax');

    expect(cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      'refresh.jwt',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        secure: false,
        sameSite: 'lax',
        maxAge: 2592000 * 1000,
      }),
    );
  });

  it('чистит refresh cookie с теми же secure и sameSite', () => {
    clearRefreshTokenCookie(res, false, 'lax');

    expect(clearCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        secure: false,
        sameSite: 'lax',
      }),
    );
  });

  it('прокидывает none + secure для кросс-сайта по HTTPS', () => {
    setRefreshTokenCookie(res, 'refresh.jwt', 60, true, 'none');
    clearRefreshTokenCookie(res, true, 'none');

    expect(cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      'refresh.jwt',
      expect.objectContaining({ secure: true, sameSite: 'none' }),
    );
    expect(clearCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      expect.objectContaining({ secure: true, sameSite: 'none' }),
    );
  });
});
