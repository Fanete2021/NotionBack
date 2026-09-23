import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Prisma } from '@prisma/client';
import { CreateProjectData } from './types';
import { ProjectsRepository } from './projects.repository';
import { ProjectEntity } from './entities';
import { UpdateProjectDto, ReorderProjectsDto } from './dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    @InjectPinoLogger(ProjectsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(
    workspaceId: string,
    data: CreateProjectData,
  ): Promise<ProjectEntity> {
    await this.assertParentInWorkspace(workspaceId, data.parentProjectId);
    const project = await this.projectsRepository.create(workspaceId, data);

    this.logger.info(
      { projectId: project.id, workspaceId, action: 'project_create' },
      'project created',
    );

    return project;
  }

  async findAllByWorkspaceId(workspaceId: string): Promise<ProjectEntity[]> {
    const flat =
      await this.projectsRepository.findAllByWorkspaceId(workspaceId);
    return this.buildTree(flat);
  }

  async findById(id: string): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(
    id: string,
    data: UpdateProjectDto,
    existingProject?: ProjectEntity,
  ): Promise<ProjectEntity> {
    const project =
      existingProject ?? (await this.projectsRepository.findById(id));
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const payload: Prisma.ProjectUncheckedUpdateInput = {
      name: data.name,
      color: data.color,
      icon: data.icon,
    };

    const isParentChanging =
      data.parentProjectId !== undefined &&
      (data.parentProjectId ?? null) !== project.parentProjectId;

    if (isParentChanging) {
      const newParentId = data.parentProjectId ?? null;
      await this.assertParentInWorkspace(project.workspaceId, newParentId);
      await this.assertNotOwnDescendant(project, newParentId);

      payload.parentProjectId = newParentId;
      payload.position = await this.projectsRepository.nextPosition(
        project.workspaceId,
        newParentId,
      );
    }

    const updated = await this.projectsRepository.update(id, payload);
    if (!updated) {
      throw new NotFoundException('Project not found');
    }

    this.logger.info(
      {
        projectId: id,
        workspaceId: project.workspaceId,
        action: 'project_update',
      },
      'project updated',
    );

    return updated;
  }

  async reorder(
    workspaceId: string,
    dto: ReorderProjectsDto,
  ): Promise<ProjectEntity[]> {
    const parentProjectId = dto.parentProjectId ?? null;
    await this.assertParentInWorkspace(workspaceId, parentProjectId);

    const flat = await this.projectsRepository.reorder(
      workspaceId,
      parentProjectId,
      dto.orderedIds,
    );

    if (!flat) {
      this.logger.warn(
        {
          workspaceId,
          action: 'project_reorder',
          reason: 'invalid_ordered_ids',
        },
        'project reorder rejected',
      );
      throw new BadRequestException(
        'orderedIds must include exactly the sibling projects',
      );
    }

    this.logger.info(
      { workspaceId, action: 'project_reorder' },
      'projects reordered',
    );

    return this.buildTree(flat);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.projectsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Project not found');
    }

    this.logger.info(
      { projectId: id, action: 'project_delete' },
      'project deleted',
    );
  }

  private async assertParentInWorkspace(
    workspaceId: string,
    parentProjectId: string | null | undefined,
  ): Promise<void> {
    if (!parentProjectId) {
      return;
    }

    const parent = await this.projectsRepository.findById(parentProjectId);
    if (!parent || parent.workspaceId !== workspaceId) {
      throw new BadRequestException(
        'Parent project not found or not in the same workspace',
      );
    }
  }

  private async assertNotOwnDescendant(
    project: ProjectEntity,
    newParentId: string | null,
  ): Promise<void> {
    if (!newParentId) {
      return;
    }
    if (newParentId === project.id) {
      throw new BadRequestException('A project cannot be its own parent');
    }

    const flat = await this.projectsRepository.findAllByWorkspaceId(
      project.workspaceId,
    );
    const parentById = new Map(
      flat.map((item) => [item.id, item.parentProjectId]),
    );

    let cursor: string | null = newParentId;
    while (cursor) {
      if (cursor === project.id) {
        throw new BadRequestException(
          'Cannot move a project into its own subtree',
        );
      }
      cursor = parentById.get(cursor) ?? null;
    }
  }

  private buildTree(projects: ProjectEntity[]): ProjectEntity[] {
    const children = new Map<string, ProjectEntity[]>();
    const projectIds = new Set(projects.map((project) => project.id));
    const roots: ProjectEntity[] = [];

    for (const project of projects) {
      if (project.parentProjectId && projectIds.has(project.parentProjectId)) {
        const siblings = children.get(project.parentProjectId) ?? [];
        siblings.push(project);
        children.set(project.parentProjectId, siblings);
      } else {
        roots.push(project);
      }
    }

    const attach = (project: ProjectEntity): ProjectEntity => {
      const childProjects = (children.get(project.id) ?? []).map(attach);
      return new ProjectEntity({
        id: project.id,
        workspaceId: project.workspaceId,
        parentProjectId: project.parentProjectId,
        name: project.name,
        color: project.color,
        icon: project.icon,
        position: project.position,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        childProjects,
      });
    };

    return roots.map(attach);
  }
}
