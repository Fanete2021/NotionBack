import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateProjectData,
  ProjectsRepository,
} from '../repositories/projects.repository';
import { ProjectEntity } from '../entities/project.entity';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ReorderProjectsDto } from '../dto/reorder-projects.dto';

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
    return this.projectsRepository.findAllByWorkspaceId(workspaceId);
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

    const tree = await this.projectsRepository.reorder(
      workspaceId,
      parentProjectId,
      dto.orderedIds,
    );

    if (!tree) {
      throw new BadRequestException(
        'orderedIds must include exactly the sibling projects',
      );
    }

    return tree;
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
}
