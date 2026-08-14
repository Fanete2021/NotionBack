import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateProjectData, ProjectsRepository } from './projects.repository';
import { ProjectEntity } from './entities/project.entity';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ReorderProjectsDto } from './dto/reorder-projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  async create(
    workspaceId: string,
    data: CreateProjectData,
  ): Promise<ProjectEntity> {
    await this.assertParentInWorkspace(workspaceId, data.parentProjectId);
    return this.projectsRepository.create(workspaceId, data);
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

  async update(id: string, data: UpdateProjectDto): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.assertParentInWorkspace(
      project.workspaceId,
      data.parentProjectId ?? null,
    );

    const payload: Prisma.ProjectUncheckedUpdateInput = {
      name: data.name,
      parentProjectId: data.parentProjectId,
      color: data.color,
      icon: data.icon,
    };

    const updated = await this.projectsRepository.update(id, payload);
    if (!updated) {
      throw new NotFoundException('Project not found');
    }
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
      throw new BadRequestException(
        'orderedIds must include exactly the sibling projects',
      );
    }

    return this.buildTree(flat);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.projectsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Project not found');
    }
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
      project.childProjects = (children.get(project.id) ?? []).map(attach);
      return project;
    };

    return roots.map(attach);
  }
}
