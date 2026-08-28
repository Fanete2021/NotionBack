import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from '../services/projects.service';
import { ProjectEntity } from '../entities/project.entity';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard';
import type { Request } from 'express';

type AuthenticatedRequest = Request & { project?: ProjectEntity };

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const mockProjectsService = {
    update: jest.fn(),
    delete: jest.fn(),
  };

  const project = new ProjectEntity({
    id: 'p1',
    workspaceId: 'ws-1',
    parentProjectId: null,
    name: 'Work',
    color: null,
    icon: null,
    position: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: mockProjectsService }],
    })
      .overrideGuard(WorkspaceMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ProjectsController);
  });

  it('findById возвращает проект из request', () => {
    expect(
      controller.findById({ project } as unknown as AuthenticatedRequest),
    ).toBe(project);
  });

  it('findById бросает 500, если guard не положил проект', () => {
    expect(() =>
      controller.findById({} as unknown as AuthenticatedRequest),
    ).toThrow(InternalServerErrorException);
  });

  it('update делегирует в сервис', async () => {
    mockProjectsService.update.mockResolvedValue(project);

    await expect(
      controller.update('p1', { name: 'New' }, {
        project,
      } as unknown as AuthenticatedRequest),
    ).resolves.toBe(project);
    expect(mockProjectsService.update).toHaveBeenCalledWith(
      'p1',
      { name: 'New' },
      project,
    );
  });

  it('delete делегирует в сервис', async () => {
    mockProjectsService.delete.mockResolvedValue(undefined);

    await expect(controller.delete('p1')).resolves.toBeUndefined();
    expect(mockProjectsService.delete).toHaveBeenCalledWith('p1');
  });
});
