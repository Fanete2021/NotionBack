import { createHash } from 'crypto';

function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export { hashInviteToken };
