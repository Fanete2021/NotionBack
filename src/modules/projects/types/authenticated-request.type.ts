import { Request } from 'express';
import { ProjectEntity } from '../entities/project.entity';
import { UserPayload } from '../../../common/types/user-payload.type';

type AuthenticatedRequest = Request & {
  user?: UserPayload;
  project?: ProjectEntity;
};

export type { AuthenticatedRequest };
