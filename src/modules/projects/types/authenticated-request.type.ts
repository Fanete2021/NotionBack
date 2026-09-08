import { Request } from 'express';
import { ProjectEntity } from '../entities';
import { UserPayload } from '../../../common/types';

type AuthenticatedRequest = Request & {
  user?: UserPayload;
  project?: ProjectEntity;
};

export type { AuthenticatedRequest };
