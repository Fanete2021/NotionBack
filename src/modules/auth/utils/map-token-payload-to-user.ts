import { UserPayload } from '@common/types';
import { TokenPayload } from '@modules/auth/types';

function mapTokenPayloadToUser(payload: TokenPayload): UserPayload {
  return { id: payload.sub, email: payload.email };
}

export { mapTokenPayloadToUser };
