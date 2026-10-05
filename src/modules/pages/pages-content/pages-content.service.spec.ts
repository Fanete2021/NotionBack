jest.mock('../pages-version', () => ({ PagesVersionService: class {} }));

import { ConflictException } from '@nestjs/common';
import { PagesContentService } from './pages-content.service';

describe('PagesContentService (Yjs interplay)', () => {
  const page = { id: 'page-1' } as never;

  const repository = { findContent: jest.fn(), upsertContent: jest.fn() };
  const config = { get: jest.fn((_key: string, fallback: number) => fallback) };
  const versions = { scheduleAutoSnapshot: jest.fn() };
  const yjs = { isActive: jest.fn(), getLiveJson: jest.fn() };

  let service: PagesContentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PagesContentService(
      repository as never,
      config as never,
      versions as never,
      yjs as never,
    );
  });

  it('refuses a REST write while a realtime session is active', async () => {
    yjs.isActive.mockReturnValue(true);

    await expect(
      service.updateContent(page, { type: 'doc' }, 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.upsertContent).not.toHaveBeenCalled();
  });

  it('writes through REST when no realtime session is active', async () => {
    yjs.isActive.mockReturnValue(false);
    repository.upsertContent.mockResolvedValue({ pageId: 'page-1' });

    await service.updateContent(page, { type: 'doc' }, 'user-1');

    expect(repository.upsertContent).toHaveBeenCalled();
    expect(versions.scheduleAutoSnapshot).toHaveBeenCalledWith(
      'page-1',
      'user-1',
    );
  });

  it('serves the live document instead of the lagging DB copy', async () => {
    const live = { type: 'doc', content: [] };
    yjs.getLiveJson.mockReturnValue(live);

    const result = await service.getContent(page);

    expect(result.json).toBe(live);
    expect(repository.findContent).not.toHaveBeenCalled();
  });
});
