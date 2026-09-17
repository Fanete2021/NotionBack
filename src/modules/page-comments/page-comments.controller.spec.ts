import { Test, TestingModule } from '@nestjs/testing';
import { PageCommentsController } from '@modules/page-comments/page-comments.controller';
import { PageCommentsService } from '@modules/page-comments/page-comments.service';

describe('PageCommentsController', () => {
  let controller: PageCommentsController;

  const mockPageCommentsService = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setResolved: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PageCommentsController],
      providers: [
        { provide: PageCommentsService, useValue: mockPageCommentsService },
      ],
    }).compile();

    controller = module.get(PageCommentsController);
  });

  it('list делегирует в сервис', async () => {
    mockPageCommentsService.list.mockResolvedValue([]);

    await controller.list('page-1', {});

    expect(mockPageCommentsService.list).toHaveBeenCalledWith('page-1', {});
  });

  it('create делегирует в сервис', async () => {
    mockPageCommentsService.create.mockResolvedValue({ id: 'c1' });

    await controller.create('user-1', 'page-1', { body: 'Hi' });

    expect(mockPageCommentsService.create).toHaveBeenCalledWith(
      'page-1',
      'user-1',
      { body: 'Hi' },
    );
  });
});
