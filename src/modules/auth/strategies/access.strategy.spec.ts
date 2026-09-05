import { ConfigService } from '@nestjs/config';
import { AccessStrategy } from './access.strategy';

describe('AccessStrategy', () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('access-secret'),
  } as unknown as ConfigService;

  it('маппит jwt payload в пользователя', () => {
    const strategy = new AccessStrategy(configService);

    expect(
      strategy.validate({ sub: 'user-1', email: 'user@test.com' }),
    ).toEqual({
      id: 'user-1',
      email: 'user@test.com',
    });
  });
});
