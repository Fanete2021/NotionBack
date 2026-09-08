import { mapTokenPayloadToUser } from './map-token-payload-to-user';

describe('mapTokenPayloadToUser', () => {
  it('маппит sub и email в UserPayload', () => {
    expect(
      mapTokenPayloadToUser({ sub: 'user-1', email: 'user@test.com' }),
    ).toEqual({
      id: 'user-1',
      email: 'user@test.com',
    });
  });
});
