import { Request } from 'express';
import { ProjectEntity } from '@modules/projects/entities';
import { UserPayload } from '@common/types';

type AuthenticatedRequest = Request & {
  user?: UserPayload;
  project?: ProjectEntity;
};

export type { AuthenticatedRequest };
