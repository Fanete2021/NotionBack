import { Page, PageType, Prisma } from '@prisma/client';
import { Socket } from 'socket.io';

type CreatePageData = {
  projectId: string;
  title: string;
  icon: string | null;
  type: PageType;
};

const USER_REF_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

type UserRef = Prisma.UserGetPayload<{ select: typeof USER_REF_SELECT }>;

type TrashedPageRow = Page & {
  author: UserRef;
  deletedByUser: UserRef | null;
};

interface PresenceUser {
  id: string;
  name: string;
  avatar: string | null;
}

interface SocketData {
  user?: PresenceUser;
}

type AuthedSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  SocketData
>;

export { USER_REF_SELECT };
export type {
  AuthedSocket,
  CreatePageData,
  PresenceUser,
  TrashedPageRow,
  UserRef,
};
