import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { WorkspacesService } from '../services/workspaces.service';
import { ProjectsService } from '../services/projects.service';
import { ProjectEntity } from '../entities/project.entity';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
  project?: ProjectEntity;
}

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsService: ProjectsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;

    if (!userId) {
      return false;
    }

    let workspaceId = Array.isArray(request.params.workspaceId)
      ? request.params.workspaceId[0]
      : request.params.workspaceId;
    const projectId = Array.isArray(request.params.id)
      ? request.params.id[0]
      : request.params.id;

    // Если у нас роут с проектом, но без workspaceId (например, /projects/:id)
    if (!workspaceId && projectId) {
      const project = await this.projectsService.findById(projectId);
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      workspaceId = project.workspaceId;
      // Сохраняем проект в запрос, чтобы не читать его из БД повторно в контроллере/сервисе
      request.project = project;
    }

    if (!workspaceId) {
      return false;
    }

    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return true;
  }
}
