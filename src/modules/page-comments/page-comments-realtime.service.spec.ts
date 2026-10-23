import { PageCommentEntity } from './entities';
import { PageCommentsRealtimeService } from './page-comments-realtime.service';
import { createMockPinoLogger, asPinoLogger } from '@common/testing';

describe('PageCommentsRealtimeService', () => {
  const logger = createMockPinoLogger();
  const comment = new PageCommentEntity({
    id: 'comment-1',
    pageId: 'page-1',
    body: 'Text',
    anchorId: null,
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    authorInfo: {
      id: 'user-1',
      name: 'Author',
      email: 'a@example.com',
      avatarUrl: null,
    },
  });

  let service: PageCommentsRealtimeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PageCommentsRealtimeService(asPinoLogger(logger));
  });

  it('не рассылает событие, пока никто не подписался', () => {
    expect(() => service.publish('user-1', 'created', comment)).not.toThrow();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('передаёт комментарий и автора подписчику', () => {
    const publish = jest.fn();
    service.register(publish);

    service.publish('user-2', 'updated', comment);

    expect(publish).toHaveBeenCalledWith({
      pageId: 'page-1',
      action: 'updated',
      commentId: 'comment-1',
      actorId: 'user-2',
      comment,
    });
  });

  it('для удаления отдаёт id и автора без тела', () => {
    const publish = jest.fn();
    service.register(publish);

    service.publishDeleted('user-1', 'page-1', 'comment-1');

    expect(publish).toHaveBeenCalledWith({
      pageId: 'page-1',
      action: 'deleted',
      commentId: 'comment-1',
      actorId: 'user-1',
    });
  });

  it('ошибка рассылки не ломает уже сохранённый комментарий', () => {
    service.register(() => {
      throw new Error('socket is not ready');
    });

    expect(() => service.publish('user-1', 'created', comment)).not.toThrow();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'page_comment_publish',
        pageId: 'page-1',
        commentId: 'comment-1',
        userId: 'user-1',
        reason: 'socket is not ready',
      }),
      'page comment broadcast failed',
    );
  });
});
