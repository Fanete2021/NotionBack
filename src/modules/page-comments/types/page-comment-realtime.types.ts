import type { PageCommentEntity } from '../entities';

type PageCommentRealtimeAction = 'created' | 'updated' | 'deleted';

interface PageCommentRealtimeEvent {
  pageId: string;
  action: PageCommentRealtimeAction;
  commentId: string;
  actorId: string;
  comment?: PageCommentEntity;
}

export type { PageCommentRealtimeAction, PageCommentRealtimeEvent };
