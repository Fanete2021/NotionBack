import { PageCommentMapper } from './page-comment.mapper';
import { PageCommentEntity } from './entities';

describe('PageCommentMapper', () => {
  const mapper = new PageCommentMapper();

  it('маппит запись с автором в PageCommentEntity', () => {
    const result = mapper.toEntity({
      id: 'comment-1',
      pageId: 'page-1',
      authorId: 'user-1',
      body: 'Hello',
      anchorId: 'anchor-1',
      resolved: false,
      resolvedAt: null,
      resolvedById: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      author: {
        id: 'user-1',
        name: 'Author',
        email: 'author@example.com',
        avatarUrl: null,
      },
      resolvedBy: null,
    });

    expect(result).toBeInstanceOf(PageCommentEntity);
    expect(result.authorInfo.email).toBe('author@example.com');
  });
});
