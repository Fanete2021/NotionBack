import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { ProjectEntity } from '@modules/projects/entities';
import { ProjectsService } from '@modules/projects/projects.service';
import { AuthenticatedRequest } from '@modules/projects/types';
import { WorkspaceProjectGuard } from '.';

describe('WorkspaceProjectGuard', () => {
  let guard: WorkspaceProjectGuard;
  let projectsService: { findById: jest.Mock };

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

  const createContext = (
    request: Partial<AuthenticatedRequest>,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    projectsService = { findById: jest.fn() };
    guard = new WorkspaceProjectGuard(
      projectsService as unknown as ProjectsService,
    );
  });

  it('возвращает false, если пользователь не аутентифицирован', async () => {
    await expect(
      guard.canActivate(createContext({ params: { id: 'p1' } })),
    ).resolves.toBe(false);
    expect(projectsService.findById).not.toHaveBeenCalled();
  });

  it('кладёт проект в request и возвращает true', async () => {
    projectsService.findById.mockResolvedValue(project);
    const request: Partial<AuthenticatedRequest> = {
      user: { id: 'user-1', email: 'user@test.com' },
      params: { id: 'p1' },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(projectsService.findById).toHaveBeenCalledWith('p1');
    expect(request.project).toBe(project);
  });

  it('берёт первый id, если params.id — массив', async () => {
    projectsService.findById.mockResolvedValue(project);
    const request: Partial<AuthenticatedRequest> = {
      user: { id: 'user-1', email: 'user@test.com' },
      params: { id: ['p1', 'p2'] },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(projectsService.findById).toHaveBeenCalledWith('p1');
  });

  it('бросает NotFoundException, если проект не найден', async () => {
    projectsService.findById.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        createContext({
          user: { id: 'user-1', email: 'user@test.com' },
          params: { id: 'missing' },
        }),
      ),
    ).rejects.toThrow(new NotFoundException('Project not found'));
  });
});
