import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { S3StorageService } from './s3-storage.service';
import { PagesService } from '../pages/pages.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AttachmentsRepository } from './attachments.repository';

describe('AttachmentsService', () => {
  let service: AttachmentsService;

  interface CreateAttachmentArgs {
    pageId: string;
    workspaceId: string;
    uploadedBy: string;
    fileName: string;
    contentType: string;
    size: number;
    key: string;
  }

  const mockAttachmentsRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    markConfirmed: jest.fn(),
    delete: jest.fn(),
  };
  const mockStorage = {
    getUploadUrl: jest.fn(),
    getObjectInfo: jest.fn(),
    deleteObject: jest.fn(),
    buildPublicUrl: jest.fn(),
  };
  const mockPagesService = { findById: jest.fn() };
  const mockWorkspacesService = { assertMemberOf: jest.fn() };
  const mockConfigService = { get: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      const map: Record<string, number> = {
        ATTACHMENT_IMAGE_MAX_BYTES: 100,
        ATTACHMENT_VIDEO_MAX_BYTES: 200,
        ATTACHMENT_PRESIGN_EXPIRES_SECONDS: 300,
      };
      return map[key];
    });
    mockStorage.buildPublicUrl.mockImplementation(
      (key: string) => `http://cdn.test/${key}`,
    );

    const module = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        { provide: AttachmentsRepository, useValue: mockAttachmentsRepository },
        { provide: S3StorageService, useValue: mockStorage },
        { provide: PagesService, useValue: mockPagesService },
        { provide: WorkspacesService, useValue: mockWorkspacesService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AttachmentsService>(AttachmentsService);
  });

  describe('presign', () => {
    beforeEach(() => {
      mockPagesService.findById.mockResolvedValue({
        id: 'page-1',
        workspaceId: 'ws-1',
      });
      mockWorkspacesService.assertMemberOf.mockResolvedValue(undefined);
      mockStorage.getUploadUrl.mockResolvedValue('https://s3.test/signed');
      mockAttachmentsRepository.create.mockImplementation((data) =>
        Promise.resolve({
          id: 'att-1',
          ...data,
          status: 'PENDING',
          createdAt: new Date(),
        }),
      );
    });

    it('создаёт PENDING-строку и подписанный PUT-url', async () => {
      const result = await service.presign(
        'user-1',
        'page-1',
        'cat.png',
        'image/png',
        50,
      );

      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockStorage.getUploadUrl).toHaveBeenCalledWith(
        expect.any(String),
        'image/png',
        300,
      );
      expect(mockAttachmentsRepository.create).toHaveBeenCalledTimes(1);

      const [created] = mockAttachmentsRepository.create.mock
        .calls[0] as unknown as [CreateAttachmentArgs];
      expect(created.key).toMatch(
        /^workspaces\/ws-1\/pages\/page-1\/[0-9a-f-]{36}\.png$/,
      );
      expect(created.uploadedBy).toBe('user-1');
      expect(created.size).toBe(50);

      expect(result.attachmentId).toBe('att-1');
      expect(result.uploadUrl).toBe('https://s3.test/signed');
      expect(result.publicUrl).toBe(`http://cdn.test/${created.key}`);
    });

    it('берёт расширение из whitelist, а не из имени файла', async () => {
      await service.presign('user-1', 'page-1', 'evil.php', 'image/gif', 10);

      const [created] = mockAttachmentsRepository.create.mock
        .calls[0] as unknown as [CreateAttachmentArgs];
      expect(created.key.endsWith('.gif')).toBe(true);
      expect(created.fileName).toBe('evil.php');
    });

    it('запрещает тип не из whitelist', async () => {
      await expect(
        service.presign('user-1', 'page-1', 'doc.pdf', 'application/pdf', 10),
      ).rejects.toThrow(BadRequestException);
      expect(mockAttachmentsRepository.create).not.toHaveBeenCalled();
      expect(mockStorage.getUploadUrl).not.toHaveBeenCalled();
    });

    it('запрещает неположительный размер', async () => {
      await expect(
        service.presign('user-1', 'page-1', 'cat.png', 'image/png', 0),
      ).rejects.toThrow(BadRequestException);
    });

    it('отклоняет картинку больше лимита (413)', async () => {
      await expect(
        service.presign('user-1', 'page-1', 'big.png', 'image/png', 101),
      ).rejects.toThrow(PayloadTooLargeException);
      expect(mockAttachmentsRepository.create).not.toHaveBeenCalled();
    });

    it('для видео действует отдельный лимит', async () => {
      await expect(
        service.presign('user-1', 'page-1', 'clip.mp4', 'video/mp4', 201),
      ).rejects.toThrow(PayloadTooLargeException);

      await service.presign('user-1', 'page-1', 'clip.mp4', 'video/mp4', 200);
      expect(mockAttachmentsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('пробрасывает 404, если страница не найдена', async () => {
      mockPagesService.findById.mockRejectedValue(
        new NotFoundException('Page not found'),
      );

      await expect(
        service.presign('user-1', 'page-404', 'cat.png', 'image/png', 10),
      ).rejects.toThrow(NotFoundException);
      expect(mockAttachmentsRepository.create).not.toHaveBeenCalled();
    });

    it('пробрасывает 403, если пользователь не член воркспейса', async () => {
      mockWorkspacesService.assertMemberOf.mockRejectedValue(
        new ForbiddenException('You are not a member of this workspace'),
      );

      await expect(
        service.presign('user-outside', 'page-1', 'cat.png', 'image/png', 10),
      ).rejects.toThrow(ForbiddenException);
      expect(mockAttachmentsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    const pendingAttachment = {
      id: 'att-1',
      pageId: 'page-1',
      workspaceId: 'ws-1',
      uploadedBy: 'user-1',
      fileName: 'cat.png',
      contentType: 'image/png',
      size: 50,
      key: 'workspaces/ws-1/pages/page-1/uuid.png',
      status: 'PENDING' as const,
      createdAt: new Date(),
    };

    it('подтверждает загрузку после проверки реального файла', async () => {
      mockAttachmentsRepository.findById.mockResolvedValue(pendingAttachment);
      mockWorkspacesService.assertMemberOf.mockResolvedValue(undefined);
      mockStorage.getObjectInfo.mockResolvedValue({
        size: 80,
        contentType: 'image/png',
      });
      mockAttachmentsRepository.markConfirmed.mockResolvedValue({
        ...pendingAttachment,
        status: 'CONFIRMED',
      });

      const result = await service.confirm('user-1', 'att-1');

      expect(mockStorage.getObjectInfo).toHaveBeenCalledWith(
        pendingAttachment.key,
      );
      expect(result.status).toBe('CONFIRMED');
      expect(result.publicUrl).toBe(`http://cdn.test/${pendingAttachment.key}`);
      expect(mockStorage.deleteObject).not.toHaveBeenCalled();
    });

    it('идемпотентен для уже подтверждённого вложения', async () => {
      mockAttachmentsRepository.findById.mockResolvedValue({
        ...pendingAttachment,
        status: 'CONFIRMED',
      });

      const result = await service.confirm('user-1', 'att-1');

      expect(result.status).toBe('CONFIRMED');
      expect(mockStorage.getObjectInfo).not.toHaveBeenCalled();
      expect(mockAttachmentsRepository.markConfirmed).not.toHaveBeenCalled();
    });

    it('бросает 404, если вложение не найдено', async () => {
      mockAttachmentsRepository.findById.mockResolvedValue(null);

      await expect(service.confirm('user-1', 'att-404')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('подтвердить может только загрузчик', async () => {
      mockAttachmentsRepository.findById.mockResolvedValue(pendingAttachment);

      await expect(service.confirm('user-2', 'att-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockStorage.getObjectInfo).not.toHaveBeenCalled();
    });

    it('бросает 400, если файл ещё не загружен в хранилище', async () => {
      mockAttachmentsRepository.findById.mockResolvedValue(pendingAttachment);
      mockWorkspacesService.assertMemberOf.mockResolvedValue(undefined);
      mockStorage.getObjectInfo.mockResolvedValue(null);

      await expect(service.confirm('user-1', 'att-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAttachmentsRepository.markConfirmed).not.toHaveBeenCalled();
    });

    it('удаляет объект и строку, если реальный размер больше лимита (413)', async () => {
      mockAttachmentsRepository.findById.mockResolvedValue(pendingAttachment);
      mockWorkspacesService.assertMemberOf.mockResolvedValue(undefined);
      mockStorage.getObjectInfo.mockResolvedValue({
        size: 500,
        contentType: 'image/png',
      });

      await expect(service.confirm('user-1', 'att-1')).rejects.toThrow(
        PayloadTooLargeException,
      );
      expect(mockStorage.deleteObject).toHaveBeenCalledWith(
        pendingAttachment.key,
      );
      expect(mockAttachmentsRepository.delete).toHaveBeenCalledWith('att-1');
      expect(mockAttachmentsRepository.markConfirmed).not.toHaveBeenCalled();
    });

    it('удаляет объект и строку при несовпадении content type', async () => {
      mockAttachmentsRepository.findById.mockResolvedValue(pendingAttachment);
      mockWorkspacesService.assertMemberOf.mockResolvedValue(undefined);
      mockStorage.getObjectInfo.mockResolvedValue({
        size: 50,
        contentType: 'video/mp4',
      });

      await expect(service.confirm('user-1', 'att-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockStorage.deleteObject).toHaveBeenCalledWith(
        pendingAttachment.key,
      );
      expect(mockAttachmentsRepository.delete).toHaveBeenCalledWith('att-1');
    });
  });
});
