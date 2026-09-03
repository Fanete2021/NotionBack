import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PagesService } from '../pages/pages.service';
import { S3StorageService } from '../s3/services';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AttachmentsMapper } from './attachments.mapper';
import { AttachmentsRepository } from './attachments.repository';
import { AttachmentsService } from './attachments.service';
import { PresignAttachmentDto } from './dto';
import { AttachmentRecord } from './types';

jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => ({}),
  CronExpression: {
    EVERY_DAY_AT_MIDNIGHT: '0 0 * * *',
  },
}));

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
  const mockAttachmentMapper = {
    toEntity: jest.fn((attachment: AttachmentRecord) => ({
      id: attachment.id,
      pageId: attachment.pageId,
      workspaceId: attachment.workspaceId,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      size: attachment.size,
      status: attachment.status,
      publicUrl: `http://cdn.test/${attachment.key}`,
      createdAt: attachment.createdAt,
    })),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    mockStorage.deleteObject.mockResolvedValue(undefined);
    mockAttachmentsRepository.delete.mockResolvedValue(undefined);

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
    mockAttachmentMapper.toEntity.mockImplementation(
      (attachment: AttachmentRecord) => ({
        id: attachment.id,
        pageId: attachment.pageId,
        workspaceId: attachment.workspaceId,
        fileName: attachment.fileName,
        contentType: attachment.contentType,
        size: attachment.size,
        status: attachment.status,
        publicUrl: `http://cdn.test/${attachment.key}`,
        createdAt: attachment.createdAt,
      }),
    );

    const module = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        { provide: AttachmentsRepository, useValue: mockAttachmentsRepository },
        { provide: S3StorageService, useValue: mockStorage },
        { provide: PagesService, useValue: mockPagesService },
        { provide: WorkspacesService, useValue: mockWorkspacesService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AttachmentsMapper, useValue: mockAttachmentMapper },
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
      const result = await service.presign('user-1', {
        pageId: 'page-1',
        fileName: 'cat.png',
        contentType: 'image/png',
        size: 50,
      });

      expect(mockWorkspacesService.assertMemberOf).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
      );
      expect(mockStorage.getUploadUrl).toHaveBeenCalledWith(
        expect.any(String),
        'image/png',
        300,
        10485760,
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
      const dto: PresignAttachmentDto = {
        pageId: 'page-1',
        fileName: 'evil.php',
        contentType: 'image/gif',
        size: 10,
      };

      await service.presign('user-1', dto);

      const [created] = mockAttachmentsRepository.create.mock
        .calls[0] as unknown as [CreateAttachmentArgs];
      expect(created.key.endsWith('.gif')).toBe(true);
      expect(created.fileName).toBe('evil.php');
    });

    it('запрещает тип не из whitelist', async () => {
      const dto: PresignAttachmentDto = {
        pageId: 'page-1',
        fileName: 'doc.pdf',
        contentType: 'application/pdf',
        size: 10,
      };

      await expect(service.presign('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAttachmentsRepository.create).not.toHaveBeenCalled();
      expect(mockStorage.getUploadUrl).not.toHaveBeenCalled();
    });

    it('запрещает неположительный размер', async () => {
      const dto: PresignAttachmentDto = {
        pageId: 'page-1',
        fileName: 'cat.png',
        contentType: 'image/png',
        size: 0,
      };

      await expect(service.presign('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('отклоняет картинку больше лимита (413)', async () => {
      const dto: PresignAttachmentDto = {
        pageId: 'page-1',
        fileName: 'big.png',
        contentType: 'image/png',
        size: 101,
      };

      await expect(service.presign('user-1', dto)).rejects.toThrow(
        PayloadTooLargeException,
      );
      expect(mockAttachmentsRepository.create).not.toHaveBeenCalled();
    });

    it('для видео действует отдельный лимит', async () => {
      const dto201: PresignAttachmentDto = {
        pageId: 'page-1',
        fileName: 'clip.mp4',
        contentType: 'video/mp4',
        size: 201,
      };

      await expect(service.presign('user-1', dto201)).rejects.toThrow(
        PayloadTooLargeException,
      );

      const dto200: PresignAttachmentDto = {
        pageId: 'page-1',
        fileName: 'clip.mp4',
        contentType: 'video/mp4',
        size: 200,
      };

      await service.presign('user-1', dto200);
      expect(mockAttachmentsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('пробрасывает 404, если страница не найдена', async () => {
      mockPagesService.findById.mockRejectedValue(
        new NotFoundException('Page not found'),
      );

      const dto: PresignAttachmentDto = {
        pageId: 'page-404',
        fileName: 'cat.png',
        contentType: 'image/png',
        size: 10,
      };

      await expect(service.presign('user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockAttachmentsRepository.create).not.toHaveBeenCalled();
    });

    it('пробрасывает 403, если пользователь не член воркспейса', async () => {
      mockWorkspacesService.assertMemberOf.mockRejectedValue(
        new ForbiddenException('You are not a member of this workspace'),
      );

      const dto: PresignAttachmentDto = {
        pageId: 'page-1',
        fileName: 'cat.png',
        contentType: 'image/png',
        size: 10,
      };

      await expect(service.presign('user-outside', dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockAttachmentsRepository.create).not.toHaveBeenCalled();
    });

    it('не создаёт строку в базе, если подпись url упала (нет PENDING-сироты)', async () => {
      mockStorage.getUploadUrl.mockRejectedValue(new Error('s3 unavailable'));

      const dto: PresignAttachmentDto = {
        pageId: 'page-1',
        fileName: 'cat.png',
        contentType: 'image/png',
        size: 10,
      };

      await expect(service.presign('user-1', dto)).rejects.toThrow(
        's3 unavailable',
      );
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

      mockStorage.deleteObject.mockResolvedValue(undefined);
      mockAttachmentsRepository.delete.mockResolvedValue(undefined);

      await expect(service.confirm('user-1', 'att-1')).rejects.toThrow(
        PayloadTooLargeException,
      );

      expect(mockStorage.deleteObject).toHaveBeenCalledWith(
        pendingAttachment.key,
      );
      expect(mockAttachmentsRepository.delete).toHaveBeenCalledWith('att-1');
      expect(mockAttachmentsRepository.markConfirmed).not.toHaveBeenCalled();
    });

    it('удаляет объект и строку, если в базе неизвестный content type (defensive)', async () => {
      mockAttachmentsRepository.findById.mockResolvedValue({
        ...pendingAttachment,
        contentType: 'application/zip',
      });
      mockWorkspacesService.assertMemberOf.mockResolvedValue(undefined);
      mockStorage.getObjectInfo.mockResolvedValue({
        size: 50,
        contentType: 'application/zip',
      });

      await expect(service.confirm('user-1', 'att-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockStorage.deleteObject).toHaveBeenCalledWith(
        pendingAttachment.key,
      );
      expect(mockAttachmentsRepository.delete).toHaveBeenCalledWith('att-1');
      expect(mockAttachmentsRepository.markConfirmed).not.toHaveBeenCalled();
    });
  });
});
