import { UserPayload } from '../types/auth/auth.types';
import { TokenPayload } from '../types/token/token.types';

export function mapTokenPayloadToUser(payload: TokenPayload): UserPayload {
  return { id: payload.sub, email: payload.email };
}
