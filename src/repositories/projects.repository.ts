import { Injectable } from '@nestjs/common';
import { Prisma, Project } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectEntity } from '../entities/project.entity';
import { isNotFoundError } from '../utils/prisma.utils';

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
    const project = await this.prisma.$transaction(async (tx) => {
      await this.lockSiblingGroup(
        tx,
        workspaceId,
        data.parentProjectId ?? null,
      );

      const { _max } = await tx.project.aggregate({
        where: {
          workspaceId,
          parentProjectId: data.parentProjectId ?? null,
        },
        _max: { position: true },
      });

      const position = (_max.position ?? -1) + 1;

      return tx.project.create({
        data: { ...data, workspaceId, position },
      });
    });

    return this.mapToEntity(project);
  }

  async findAllByWorkspaceId(workspaceId: string): Promise<ProjectEntity[]> {
    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: { position: 'asc' },
    });

    return projects.map((project) => this.mapToEntity(project));
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
        if (isNotFoundError(error)) {
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
    return this.prisma.$transaction(async (tx) => {
      await this.lockSiblingGroup(tx, workspaceId, parentProjectId);

      const siblings = await tx.project.findMany({
        where: {
          workspaceId,
          parentProjectId: parentProjectId ?? null,
        },
      });

      const siblingIds = siblings.map((project) => project.id);
      if (!this.isExactPermutation(orderedIds, siblingIds)) {
        return null;
      }

      if (orderedIds.length > 0) {
        const offset = orderedIds.length;
        const idList = Prisma.join(
          orderedIds.map((id) => Prisma.sql`${id}::uuid`),
        );
        const valueRows = Prisma.join(
          orderedIds.map(
            (id, index) => Prisma.sql`(${id}::uuid, ${index}::int)`,
          ),
        );

        await tx.$executeRaw`
          UPDATE "projects"
          SET "position" = "position" + ${offset}
          WHERE id IN (${idList})
        `;
        await tx.$executeRaw`
          UPDATE "projects" AS p
          SET "position" = v.position,
              "updatedAt" = NOW()
          FROM (VALUES ${valueRows}) AS v(id, position)
          WHERE p.id = v.id
        `;
      }

      const projects = await tx.project.findMany({
        where: { workspaceId },
        orderBy: { position: 'asc' },
      });

      return projects.map((project) => this.mapToEntity(project));
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.project.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
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

  private lockSiblingGroup(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    parentProjectId: string | null,
  ): Promise<unknown> {
    return tx.$queryRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${workspaceId}),
        hashtext(${parentProjectId ?? ''})
      )
    `;
  }

  private mapToEntity(project: Project): ProjectEntity {
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
    });
  }
}
