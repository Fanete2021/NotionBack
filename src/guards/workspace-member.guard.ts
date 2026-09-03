import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { WorkspacesService } from '../services/workspaces.service';
import { ProjectEntity } from '../entities/project.entity';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
  project?: ProjectEntity;
}

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private readonly workspacesService: WorkspacesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const fromParams = request.params.workspaceId;
    const workspaceId =
      (Array.isArray(fromParams) ? fromParams[0] : fromParams) ??
      request.project?.workspaceId;

    if (!workspaceId) {
      throw new BadRequestException('Workspace ID is required');
    }

    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return true;
  }
}
