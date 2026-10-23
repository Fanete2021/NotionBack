import { Test, TestingModule } from '@nestjs/testing';
import { PageCommentsController } from './page-comments.controller';
import { PageCommentsService } from './page-comments.service';
import { PageCommentsRealtimeService } from './page-comments-realtime.service';
import { PageCommentMapper } from './page-comment.mapper';
import { PageCommentEntity } from './entities';

describe('PageCommentsController', () => {
  let controller: PageCommentsController;

  const mockPageCommentsService = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setResolved: jest.fn(),
    delete: jest.fn(),
  };
  const pageCommentsRealtime = {
    publish: jest.fn(),
    publishDeleted: jest.fn(),
  };

  const commentRow = {
    id: 'comment-1',
    pageId: 'page-1',
    authorId: 'user-1',
    body: 'Hi',
    anchorId: null,
    resolved: false,
    resolvedAt: null,
    resolvedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 'user-1',
      name: 'Author',
      email: 'a@example.com',
      avatarUrl: null,
    },
    resolvedBy: null,
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PageCommentsController],
      providers: [
        PageCommentMapper,
        { provide: PageCommentsService, useValue: mockPageCommentsService },
        {
          provide: PageCommentsRealtimeService,
          useValue: pageCommentsRealtime,
        },
      ],
    }).compile();

    controller = module.get(PageCommentsController);
  });

  it('list маппит результат сервиса в entity', async () => {
    mockPageCommentsService.list.mockResolvedValue([commentRow]);

    const result = await controller.list('page-1', {});

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(PageCommentEntity);
    expect(result[0].authorInfo.id).toBe('user-1');
  });

  it('create делегирует в сервис и маппит ответ', async () => {
    mockPageCommentsService.create.mockResolvedValue(commentRow);

    const result = await controller.create('user-1', 'page-1', { body: 'Hi' });

    expect(mockPageCommentsService.create).toHaveBeenCalledWith(
      'page-1',
      'user-1',
      { body: 'Hi' },
    );
    expect(result).toBeInstanceOf(PageCommentEntity);
    expect(pageCommentsRealtime.publish).toHaveBeenCalledWith(
      'user-1',
      'created',
      result,
    );
  });

  it('delete сообщает id и автора', async () => {
    mockPageCommentsService.delete.mockResolvedValue(undefined);

    await controller.delete('user-1', 'page-1', 'comment-1');

    expect(pageCommentsRealtime.publishDeleted).toHaveBeenCalledWith(
      'user-1',
      'page-1',
      'comment-1',
    );
    expect(pageCommentsRealtime.publish).not.toHaveBeenCalled();
  });
});
