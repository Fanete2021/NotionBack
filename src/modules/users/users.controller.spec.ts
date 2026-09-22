import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('updateProfile делегирует userId и dto в сервис', async () => {
    mockUsersService.updateProfile.mockResolvedValue({ id: 'user-1' });

    await controller.updateProfile('user-1', { name: 'Новое имя' });

    expect(mockUsersService.updateProfile).toHaveBeenCalledWith('user-1', {
      name: 'Новое имя',
    });
  });
});
