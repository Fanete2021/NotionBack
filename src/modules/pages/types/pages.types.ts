import { Page, PageType, Prisma } from '@prisma/client';

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

export { USER_REF_SELECT };
export type { CreatePageData, TrashedPageRow, UserRef };
