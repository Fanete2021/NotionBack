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
    it('обновляет только переданные поля', async () => {
      const updatedUser = { id: '123', name: 'Новое имя' };
      const updatedEntity = { ...updatedUser };
      mockUsersRepository.update.mockResolvedValue(updatedUser);
      mockUsersMapper.toEntity.mockReturnValue(updatedEntity);

      const result = await usersService.updateProfile('123', {
        name: 'Новое имя',
      });

      expect(mockUsersRepository.update).toHaveBeenCalledWith('123', {
        name: 'Новое имя',
      });
      expect(mockUsersMapper.toEntity).toHaveBeenCalledWith(updatedUser);
      expect(result).toBe(updatedEntity);
    });

    it('обновляет email, если он передан', async () => {
      const updatedUser = { id: '123', email: 'new@test.com' };
      mockUsersRepository.update.mockResolvedValue(updatedUser);
      mockUsersMapper.toEntity.mockReturnValue(updatedUser);

      await usersService.updateProfile('123', { email: 'new@test.com' });

      expect(mockUsersRepository.update).toHaveBeenCalledWith('123', {
        email: 'new@test.com',
      });
    });

    it('бросает NotFoundException, если пользователь не найден', async () => {
      mockUsersRepository.update.mockResolvedValue(null);

      await expect(
        usersService.updateProfile('missing', { name: 'Новое имя' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
