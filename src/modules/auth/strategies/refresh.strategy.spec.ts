import { ConfigService } from '@nestjs/config';
import { RefreshStrategy } from './refresh.strategy';

describe('RefreshStrategy', () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('refresh-secret'),
  } as unknown as ConfigService;

  it('маппит jwt payload в пользователя', () => {
    const strategy = new RefreshStrategy(configService);

    expect(
      strategy.validate({ sub: 'user-1', email: 'user@test.com' }),
    ).toEqual({
      id: 'user-1',
      email: 'user@test.com',
    });
  });
});
