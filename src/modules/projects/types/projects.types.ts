import { Prisma } from '@prisma/client';

type CreateProjectData = Omit<
  Prisma.ProjectUncheckedCreateInput,
  'workspaceId' | 'position'
>;

export type { CreateProjectData };
