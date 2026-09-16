import { User, WorkspaceMember } from '@prisma/client';

type WorkspaceMemberUser = Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;

type WorkspaceMemberWithUser = WorkspaceMember & {
  user?: WorkspaceMemberUser;
};

export type { WorkspaceMemberUser, WorkspaceMemberWithUser };
