import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { ProjectsRepository } from '../repositories/projects.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockProjectsRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByWorkspaceId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    reorder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: ProjectsRepository, useValue: mockProjectsRepository },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('create', () => {
    it('создаёт корневой проект и не проверяет родителя', async () => {
      mockProjectsRepository.create.mockResolvedValue({ id: 'p1' });

      const data = { name: 'Work' };
      const result = await service.create('ws-1', data);

      expect(mockProjectsRepository.findById).not.toHaveBeenCalled();
      expect(mockProjectsRepository.create).toHaveBeenCalledWith('ws-1', data);
      expect(result).toEqual({ id: 'p1' });
    });

    it('создаёт подпроект, если родитель в том же воркспейсе', async () => {
      mockProjectsRepository.findById.mockResolvedValue({
        id: 'parent',
        workspaceId: 'ws-1',
      });
      mockProjectsRepository.create.mockResolvedValue({ id: 'p2' });

      const data = { name: 'Child', parentProjectId: 'parent' };

      await expect(service.create('ws-1', data)).resolves.toEqual({
        id: 'p2',
      });
      expect(mockProjectsRepository.findById).toHaveBeenCalledWith('parent');
    });

    it('бросает 400, если родитель из другого воркспейса', async () => {
      mockProjectsRepository.findById.mockResolvedValue({
        id: 'parent',
        workspaceId: 'ws-other',
      });

      await expect(
        service.create('ws-1', { name: 'X', parentProjectId: 'parent' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockProjectsRepository.create).not.toHaveBeenCalled();
    });

    it('бросает 400, если родитель не найден', async () => {
      mockProjectsRepository.findById.mockResolvedValue(null);

      await expect(
        service.create('ws-1', { name: 'X', parentProjectId: 'missing' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockProjectsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('бросает 404, если проект не найден', async () => {
      mockProjectsRepository.findById.mockResolvedValue(null);

      await expect(service.update('p1', {})).rejects.toThrow(NotFoundException);
    });

    it('бросает 400, если новый родитель из другого воркспейса', async () => {
      mockProjectsRepository.findById
        .mockResolvedValueOnce({ id: 'p1', workspaceId: 'ws-1' })
        .mockResolvedValueOnce({ id: 'parent', workspaceId: 'ws-other' });

      await expect(
        service.update('p1', { parentProjectId: 'parent' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockProjectsRepository.update).not.toHaveBeenCalled();
    });

    it('успешно обновляет с валидным родителем', async () => {
      mockProjectsRepository.findById
        .mockResolvedValueOnce({ id: 'p1', workspaceId: 'ws-1' })
        .mockResolvedValueOnce({ id: 'parent', workspaceId: 'ws-1' });
      mockProjectsRepository.update.mockResolvedValue({ id: 'p1' });

      const result = await service.update('p1', {
        name: 'New',
        parentProjectId: 'parent',
      });

      expect(mockProjectsRepository.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ name: 'New', parentProjectId: 'parent' }),
      );
      expect(result).toEqual({ id: 'p1' });
    });

    it('перемещает в корень при parentProjectId = null', async () => {
      mockProjectsRepository.findById.mockResolvedValue({
        id: 'p1',
        workspaceId: 'ws-1',
      });
      mockProjectsRepository.update.mockResolvedValue({ id: 'p1' });

      await service.update('p1', { parentProjectId: null });

      expect(mockProjectsRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockProjectsRepository.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ parentProjectId: null }),
      );
    });
  });

  describe('reorder', () => {
    it('бросает 400, если родитель из другого воркспейса', async () => {
      mockProjectsRepository.findById.mockResolvedValue({
        id: 'parent',
        workspaceId: 'ws-other',
      });

      await expect(
        service.reorder('ws-1', {
          parentProjectId: 'parent',
          orderedIds: ['p1'],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockProjectsRepository.reorder).not.toHaveBeenCalled();
    });

    it('бросает 400, если orderedIds не является точной перестановкой соседей', async () => {
      mockProjectsRepository.reorder.mockResolvedValue(null);

      await expect(
        service.reorder('ws-1', { orderedIds: ['p1'] }),
      ).rejects.toThrow(BadRequestException);
      expect(mockProjectsRepository.reorder).toHaveBeenCalledWith(
        'ws-1',
        null,
        ['p1'],
      );
    });

    it('успешно переупорядочивает и возвращает дерево', async () => {
      const flat = [
        { id: 'p1', parentProjectId: null, childProjects: [] },
        { id: 'p2', parentProjectId: null, childProjects: [] },
      ];
      mockProjectsRepository.reorder.mockResolvedValue(flat);

      const result = await service.reorder('ws-1', {
        orderedIds: ['p2', 'p1'],
      });

      expect(mockProjectsRepository.reorder).toHaveBeenCalledWith(
        'ws-1',
        null,
        ['p2', 'p1'],
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('findAllByWorkspaceId', () => {
    it('собирает дерево из плоского списка репозитория', async () => {
      const flat = [
        { id: 'root', parentProjectId: null, childProjects: [] },
        { id: 'child', parentProjectId: 'root', childProjects: [] },
      ];
      mockProjectsRepository.findAllByWorkspaceId.mockResolvedValue(flat);

      const result = await service.findAllByWorkspaceId('ws-1');

      expect(mockProjectsRepository.findAllByWorkspaceId).toHaveBeenCalledWith(
        'ws-1',
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('root');
      expect(result[0].childProjects).toHaveLength(1);
      expect(result[0].childProjects[0].id).toBe('child');
    });
  });

  describe('delete', () => {
    it('бросает 404, если проект не существует', async () => {
      mockProjectsRepository.delete.mockResolvedValue(false);

      await expect(service.delete('p1')).rejects.toThrow(NotFoundException);
    });

    it('удаляет существующий проект', async () => {
      mockProjectsRepository.delete.mockResolvedValue(true);

      await expect(service.delete('p1')).resolves.toBeUndefined();
      expect(mockProjectsRepository.delete).toHaveBeenCalledWith('p1');
    });
  });
});
