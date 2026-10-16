import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PageCommentsService } from './page-comments.service';
import { PageCommentsRepository } from './page-comments.repository';
import { PageCommentMapper } from './page-comment.mapper';
import { PageCommentEntity } from './entities';
import { provideMockPinoLogger } from '@common/testing';

describe('PageCommentsService', () => {
  let service: PageCommentsService;

  const publish = jest.fn();

  const mockRepository = {
    findActivePageId: jest.fn(),
    findAllByPageId: jest.fn(),
    create: jest.fn(),
    findByIdAndPageId: jest.fn(),
    updateBody: jest.fn(),
    setResolved: jest.fn(),
    delete: jest.fn(),
  };

  const commentFixture = {
    id: 'comment-1',
    pageId: 'page-1',
    authorId: 'user-1',
    body: 'Text',
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
    jest.clearAllMocks();
    mockRepository.findActivePageId.mockResolvedValue('page-1');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageCommentsService,
        PageCommentMapper,
        { provide: PageCommentsRepository, useValue: mockRepository },
        provideMockPinoLogger(PageCommentsService.name),
      ],
    }).compile();

    service = module.get(PageCommentsService);
    service.registerRealtime(publish);
  });

  describe('list', () => {
    it('маппит resolved=true в boolean', async () => {
      mockRepository.findAllByPageId.mockResolvedValue([]);

      await service.list('page-1', { resolved: 'true' });

      expect(mockRepository.findActivePageId).toHaveBeenCalledWith('page-1');
      expect(mockRepository.findAllByPageId).toHaveBeenCalledWith('page-1', {
        anchorId: undefined,
        resolved: true,
      });
      expect(publish).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('trim body и создаёт комментарий', async () => {
      mockRepository.create.mockResolvedValue(commentFixture);

      await service.create('page-1', 'user-1', { body: '  hello  ' });

      expect(mockRepository.create).toHaveBeenCalledWith(
        'page-1',
        'user-1',
        'hello',
        null,
      );
      expect(publish).toHaveBeenCalledWith({
        pageId: 'page-1',
        action: 'created',
        commentId: 'comment-1',
        comment: expect.objectContaining({
          body: 'Text',
          authorInfo: {
            id: 'user-1',
            name: 'Author',
            email: 'a@example.com',
            avatarUrl: null,
          },
        }) as PageCommentEntity,
      });
    });

    it('бросает 400 на пустой body', async () => {
      await expect(
        service.create('page-1', 'user-1', { body: '   ' }),
      ).rejects.toThrow(BadRequestException);
      expect(publish).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('запрещает редактирование чужого комментария', async () => {
      mockRepository.findByIdAndPageId.mockResolvedValue(commentFixture);

      await expect(
        service.update('page-1', 'comment-1', 'other-user', { body: 'X' }),
      ).rejects.toThrow(ForbiddenException);
      expect(publish).not.toHaveBeenCalled();
    });

    it('обновляет свой комментарий', async () => {
      mockRepository.findByIdAndPageId.mockResolvedValue(commentFixture);
      mockRepository.updateBody.mockResolvedValue({
        ...commentFixture,
        body: 'New',
      });

      await service.update('page-1', 'comment-1', 'user-1', { body: 'New' });

      expect(mockRepository.updateBody).toHaveBeenCalledWith(
        'comment-1',
        'page-1',
        'New',
      );
      expect(publish).toHaveBeenCalledWith({
        pageId: 'page-1',
        action: 'updated',
        commentId: 'comment-1',
        comment: expect.objectContaining({ body: 'New' }) as PageCommentEntity,
      });
    });
  });

  describe('setResolved', () => {
    it('переключает resolved одним update', async () => {
      mockRepository.setResolved.mockResolvedValue({
        ...commentFixture,
        resolved: true,
      });

      await service.setResolved('page-1', 'comment-1', 'user-2', true);

      expect(mockRepository.findByIdAndPageId).not.toHaveBeenCalled();
      expect(mockRepository.setResolved).toHaveBeenCalledWith(
        'comment-1',
        'page-1',
        true,
        'user-2',
        expect.any(Date) as Date,
      );
      expect(publish).toHaveBeenCalledWith({
        pageId: 'page-1',
        action: 'updated',
        commentId: 'comment-1',
        comment: expect.objectContaining({
          resolved: true,
        }) as PageCommentEntity,
      });
    });
  });

  describe('delete', () => {
    it('удаляет свой комментарий', async () => {
      mockRepository.findByIdAndPageId.mockResolvedValue(commentFixture);
      mockRepository.delete.mockResolvedValue(true);

      await service.delete('page-1', 'comment-1', 'user-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('comment-1', 'page-1');
      expect(publish).toHaveBeenCalledWith({
        pageId: 'page-1',
        action: 'deleted',
        commentId: 'comment-1',
      });
    });

    it('запрещает удаление чужого комментария', async () => {
      mockRepository.findByIdAndPageId.mockResolvedValue(commentFixture);

      await expect(
        service.delete('page-1', 'comment-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepository.delete).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
    });

    it('404 если комментарий не найден', async () => {
      mockRepository.findByIdAndPageId.mockResolvedValue(null);

      await expect(service.delete('page-1', 'ghost', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
