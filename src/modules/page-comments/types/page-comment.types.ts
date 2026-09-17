import { PageComment, User } from '@prisma/client';

type PageCommentAuthor = Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;

type PageCommentWithAuthor = PageComment & {
  author: PageCommentAuthor;
  resolvedBy?: PageCommentAuthor | null;
};

export type { PageCommentAuthor, PageCommentWithAuthor };
