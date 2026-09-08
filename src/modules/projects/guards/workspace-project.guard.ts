import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from '../projects.service';
import { AuthenticatedRequest } from '../types';

@Injectable()
export class WorkspaceProjectGuard implements CanActivate {
  constructor(private readonly projectsService: ProjectsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;

    if (!userId) {
      return false;
    }

    const projectId = Array.isArray(request.params.id)
      ? request.params.id[0]
      : request.params.id;

    const project = await this.projectsService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    request.project = project;

    return true;
  }
}
