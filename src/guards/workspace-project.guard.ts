import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { ProjectsService } from '../services/projects.service';
import { ProjectEntity } from '../entities/project.entity';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
  project?: ProjectEntity;
}

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
