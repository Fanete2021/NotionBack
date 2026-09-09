import { JwtAuthGuard } from './jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('should throw UnauthorizedException if user is missing', () => {
      expect(() => {
        guard.handleRequest(null, null, null);
      }).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if error exists', () => {
      expect(() => {
        guard.handleRequest(new Error('error'), null, null);
      }).toThrow(UnauthorizedException);
    });

    it('should return user if present', () => {
      const user = { id: '1' };
      const result = guard.handleRequest(null, user, null);
      expect(result).toBe(user);
    });
  });

  describe('canActivate', () => {
    it('пропускает публичные маршруты без jwt', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const context = {
        getHandler: (): object => ({}),
        getClass: (): object => ({}),
      };

      expect(guard.canActivate(context as never)).toBe(true);
    });
  });
});
