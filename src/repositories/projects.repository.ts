import { Injectable } from '@nestjs/common';
import { Prisma, Project } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectEntity } from '../entities/project.entity';

export type CreateProjectData = Omit<
  Prisma.ProjectUncheckedCreateInput,
  'workspaceId' | 'position'
>;

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    data: CreateProjectData,
  ): Promise<ProjectEntity> {
    const position = await this.prisma.project.count({
      where: {
        workspaceId,
        parentProjectId: data.parentProjectId ?? null,
      },
    });

    const project = await this.prisma.project.create({
      data: { ...data, workspaceId, position },
    });

    return this.mapToEntity(project);
  }

  async findAllByWorkspaceId(workspaceId: string): Promise<ProjectEntity[]> {
    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: { position: 'asc' },
    });

    return this.buildTree(projects);
  }

  async findById(id: string): Promise<ProjectEntity | null> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return null;
    }

    return this.mapToEntity(project);
  }

  async update(
    id: string,
    data: Prisma.ProjectUncheckedUpdateInput,
  ): Promise<ProjectEntity | null> {
    const project = await this.prisma.project
      .update({
        where: { id },
        data,
      })
      .catch((error) => {
        if (this.isNotFoundError(error)) {
          return null;
        }
        throw error;
      });

    return project ? this.mapToEntity(project) : null;
  }

  async reorder(
    workspaceId: string,
    parentProjectId: string | null,
    orderedIds: string[],
  ): Promise<ProjectEntity[] | null> {
    const siblings = await this.prisma.project.findMany({
      where: {
        workspaceId,
        parentProjectId: parentProjectId ?? null,
      },
    });

    const siblingIds = siblings.map((project) => project.id);
    if (!this.isExactPermutation(orderedIds, siblingIds)) {
      return null;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [index, id] of orderedIds.entries()) {
        await tx.project.update({
          where: { id },
          data: { position: index },
        });
      }
    });

    return this.findAllByWorkspaceId(workspaceId);
  }

  private isExactPermutation(
    orderedIds: string[],
    siblingIds: string[],
  ): boolean {
    if (orderedIds.length !== siblingIds.length) {
      return false;
    }

    const orderedSet = new Set(orderedIds);
    return siblingIds.every((id) => orderedSet.has(id));
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.project.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  private buildTree(projects: Project[]): ProjectEntity[] {
    const children = new Map<string, Project[]>();
    const projectIds = new Set(projects.map((project) => project.id));
    const roots: Project[] = [];

    for (const project of projects) {
      if (project.parentProjectId && projectIds.has(project.parentProjectId)) {
        const siblings = children.get(project.parentProjectId) ?? [];
        siblings.push(project);
        children.set(project.parentProjectId, siblings);
      } else {
        roots.push(project);
      }
    }

    const toEntity = (project: Project): ProjectEntity => {
      const childEntities = (children.get(project.id) ?? []).map(toEntity);
      return this.mapToEntity(project, childEntities);
    };

    return roots.map(toEntity);
  }

  private isNotFoundError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }

  private mapToEntity(
    project: Project,
    childProjects: ProjectEntity[] = [],
  ): ProjectEntity {
    return new ProjectEntity(
      project.id,
      project.workspaceId,
      project.parentProjectId,
      project.name,
      project.color,
      project.icon,
      project.position,
      project.createdAt,
      project.updatedAt,
      childProjects,
    );
  }
}
