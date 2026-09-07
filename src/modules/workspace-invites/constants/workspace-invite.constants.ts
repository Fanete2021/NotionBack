import { Role } from '@prisma/client';

const WORKSPACE_INVITE_KEY_PREFIX = 'workspace_invite:';

const WORKSPACE_INVITE_ROLES: readonly Role[] = [Role.VIEWER, Role.EDITOR];

export { WORKSPACE_INVITE_KEY_PREFIX, WORKSPACE_INVITE_ROLES };
