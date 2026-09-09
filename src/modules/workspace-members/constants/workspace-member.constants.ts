import { WorkspaceMemberUser } from '@modules/workspace-members/types/workspace-member.types';

const MEMBER_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const satisfies Record<keyof WorkspaceMemberUser, true>;

export { MEMBER_USER_SELECT };
