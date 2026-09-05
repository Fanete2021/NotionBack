import { UserPayload } from '../../../common/types/user-payload.type';
import { TokenPayload } from '../types/token.types';

export function mapTokenPayloadToUser(payload: TokenPayload): UserPayload {
  return { id: payload.sub, email: payload.email };
}
