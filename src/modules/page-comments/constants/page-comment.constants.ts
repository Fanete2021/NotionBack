import { PageCommentAuthor } from '@modules/page-comments/types';

const MAX_COMMENT_BODY_LENGTH = 5000;
const MAX_ANCHOR_ID_LENGTH = 128;

const COMMENT_AUTHOR_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const satisfies Record<keyof PageCommentAuthor, true>;

export { MAX_COMMENT_BODY_LENGTH, MAX_ANCHOR_ID_LENGTH, COMMENT_AUTHOR_SELECT };
