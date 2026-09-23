import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UsersMapper } from './users.mapper';

describe('UsersService', () => {
  let usersService: UsersService;

  const mockUsersRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockUsersMapper = {
    toEntity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: UsersMapper, useValue: mockUsersMapper },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usersService).toBeDefined();
  });

  describe('updateProfile', () => {
    it('передаёт dto в репозиторий как есть и маппит результат в entity', async () => {
      const dto = { name: 'Новое имя', email: 'new@test.com' };
      const updatedUser = { id: '123', ...dto };
      const updatedEntity = { ...updatedUser };
      mockUsersRepository.update.mockResolvedValue(updatedUser);
      mockUsersMapper.toEntity.mockReturnValue(updatedEntity);

      const result = await usersService.updateProfile('123', dto);

      expect(mockUsersRepository.update).toHaveBeenCalledWith('123', dto);
      expect(mockUsersMapper.toEntity).toHaveBeenCalledWith(updatedUser);
      expect(result).toBe(updatedEntity);
    });

    it('бросает NotFoundException, если пользователь не найден', async () => {
      mockUsersRepository.update.mockResolvedValue(null);

      await expect(
        usersService.updateProfile('missing', { name: 'Новое имя' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
