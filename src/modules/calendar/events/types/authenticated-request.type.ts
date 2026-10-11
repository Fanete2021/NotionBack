import { Request } from 'express';
import { EventEntity } from '@modules/calendar/events/entities';
import { UserPayload } from '@common/types';

type AuthenticatedRequest = Request & {
  user?: UserPayload;
  event?: EventEntity;
};

export type { AuthenticatedRequest };
