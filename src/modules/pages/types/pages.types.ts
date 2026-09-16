import { PageType } from '@prisma/client';

type CreatePageData = {
  projectId: string;
  title: string;
  icon: string | null;
  type: PageType;
};

export type { CreatePageData };
