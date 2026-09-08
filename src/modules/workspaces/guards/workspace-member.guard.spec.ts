import {
  BadRequestException,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ProjectEntity } from '@modules/projects/entities';
import { AuthenticatedRequest } from '@modules/projects/types';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { WorkspaceMemberGuard } from '.';

describe('WorkspaceMemberGuard', () => {
  let guard: WorkspaceMemberGuard;
  let workspacesService: { assertMemberOf: jest.Mock };

  const project = new ProjectEntity({
    id: 'p1',
    workspaceId: 'ws-from-project',
    parentProjectId: null,
    name: 'Work',
    color: null,
    icon: null,
    position: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  const createContext = (request: Partial<AuthenticatedRequest>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    workspacesService = { assertMemberOf: jest.fn().mockResolvedValue(undefined) };
    guard = new WorkspaceMemberGuard(
      workspacesService as unknown as WorkspacesService,
    );
  });

  it('бросает UnauthorizedException, если пользователь не аутентифицирован', async () => {
    await expect(
      guard.canActivate(createContext({ params: { workspaceId: 'ws-1' } })),
    ).rejects.toThrow(new UnauthorizedException('User not authenticated'));
    expect(workspacesService.assertMemberOf).not.toHaveBeenCalled();
  });

  it('бросает BadRequestException, если workspaceId не передан', async () => {
    await expect(
      guard.canActivate(
        createContext({
          user: { id: 'user-1', email: 'user@test.com' },
          params: {},
        }),
      ),
    ).rejects.toThrow(new BadRequestException('Workspace ID is required'));
    expect(workspacesService.assertMemberOf).not.toHaveBeenCalled();
  });

  it('проверяет членство по workspaceId из params', async () => {
    await expect(
      guard.canActivate(
        createContext({
          user: { id: 'user-1', email: 'user@test.com' },
          params: { workspaceId: 'ws-1' },
        }),
      ),
    ).resolves.toBe(true);
    expect(workspacesService.assertMemberOf).toHaveBeenCalledWith(
      'ws-1',
      'user-1',
    );
  });

  it('берёт первый workspaceId, если params.workspaceId — массив', async () => {
    await expect(
      guard.canActivate(
        createContext({
          user: { id: 'user-1', email: 'user@test.com' },
          params: { workspaceId: ['ws-1', 'ws-2'] },
        }),
      ),
    ).resolves.toBe(true);
    expect(workspacesService.assertMemberOf).toHaveBeenCalledWith(
      'ws-1',
      'user-1',
    );
  });

  it('берёт workspaceId из request.project, если в params его нет', async () => {
    await expect(
      guard.canActivate(
        createContext({
          user: { id: 'user-1', email: 'user@test.com' },
          params: {},
          project,
        }),
      ),
    ).resolves.toBe(true);
    expect(workspacesService.assertMemberOf).toHaveBeenCalledWith(
      'ws-from-project',
      'user-1',
    );
  });

  it('пробрасывает ошибку assertMemberOf', async () => {
    const error = new Error('forbidden');
    workspacesService.assertMemberOf.mockRejectedValue(error);

    await expect(
      guard.canActivate(
        createContext({
          user: { id: 'user-1', email: 'user@test.com' },
          params: { workspaceId: 'ws-1' },
        }),
      ),
    ).rejects.toBe(error);
  });
});
