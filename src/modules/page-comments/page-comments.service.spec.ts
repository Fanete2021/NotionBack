import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PageCommentsService } from '@modules/page-comments/page-comments.service';
import { PageCommentsRepository } from '@modules/page-comments/page-comments.repository';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { PageCommentEntity } from '@modules/page-comments/entities';
import { PageCommentAuthorEntity } from '@modules/page-comments/entities';

describe('PageCommentsService', () => {
  let service: PageCommentsService;

  const mockRepository = {
    findAllByPageId: jest.fn(),
    create: jest.fn(),
    findByIdAndPageId: jest.fn(),
    updateBody: jest.fn(),
    setResolved: jest.fn(),
    delete: jest.fn(),
  };

  const mockWorkspacesService = {
    assertCanManageMembers: jest.fn(),
  };

  const authorInfo = new PageCommentAuthorEntity({
    id: 'user-1',
    name: 'Author',
    email: 'a@example.com',
  });

  const comment = new PageCommentEntity({
    id: 'comment-1',
    pageId: 'page-1',
    body: 'Text',
    anchorId: null,
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    authorInfo,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageCommentsService,
        { provide: PageCommentsRepository, useValue: mockRepository },
        { provide: WorkspacesService, useValue: mockWorkspacesService },
      ],
    }).compile();

    service = module.get(PageCommentsService);
  });

  describe('create', () => {
    it('trim body и создаёт комментарий', async () => {
      mockRepository.create.mockResolvedValue(comment);

      await service.create('page-1', 'user-1', { body: '  hello  ' });

      expect(mockRepository.create).toHaveBeenCalledWith(
        'page-1',
        'user-1',
        'hello',
        null,
      );
    });

    it('бросает 400 на пустой body', async () => {
      await expect(
        service.create('page-1', 'user-1', { body: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('запрещает редактирование чужого комментария', async () => {
      mockRepository.findByIdAndPageId.mockResolvedValue(comment);

      await expect(
        service.update('page-1', 'comment-1', 'other-user', { body: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('обновляет свой комментарий', async () => {
      mockRepository.findByIdAndPageId.mockResolvedValue(comment);
      mockRepository.updateBody.mockResolvedValue({
        ...comment,
        body: 'New',
      });

      await service.update('page-1', 'comment-1', 'user-1', { body: 'New' });

      expect(mockRepository.updateBody).toHaveBeenCalledWith(
        'comment-1',
        'page-1',
        'New',
      );
    });
  });

  describe('setResolved', () => {
    it('переключает resolved', async () => {
      mockRepository.findByIdAndPageId.mockResolvedValue(comment);
      mockRepository.setResolved.mockResolvedValue({
        ...comment,
        resolved: true,
      });

      await service.setResolved('page-1', 'comment-1', 'user-2', true);

      expect(mockRepository.setResolved).toHaveBeenCalledWith(
        'comment-1',
        'page-1',
        true,
        'user-2',
        expect.any(Date) as Date,
      );
    });
  });

  describe('delete', () => {
    it('удаляет свой комментарий без проверки admin', async () => {
      mockRepository.findByIdAndPageId.mockResolvedValue(comment);
      mockRepository.delete.mockResolvedValue(true);

      await service.delete('ws-1', 'page-1', 'comment-1', 'user-1');

      expect(
        mockWorkspacesService.assertCanManageMembers,
      ).not.toHaveBeenCalled();
    });

    it('требует admin для чужого комментария', async () => {
      mockRepository.findByIdAndPageId.mockResolvedValue(comment);
      mockWorkspacesService.assertCanManageMembers.mockResolvedValue(undefined);
      mockRepository.delete.mockResolvedValue(true);

      await service.delete('ws-1', 'page-1', 'comment-1', 'admin-1');

      expect(mockWorkspacesService.assertCanManageMembers).toHaveBeenCalledWith(
        'ws-1',
        'admin-1',
      );
    });

    it('404 если комментарий не найден', async () => {
      mockRepository.findByIdAndPageId.mockResolvedValue(null);

      await expect(
        service.delete('ws-1', 'page-1', 'ghost', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
