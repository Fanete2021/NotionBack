import { Injectable } from '@nestjs/common';
import { Prisma, Workspace } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { WorkspaceEntity } from '@modules/workspaces/entities';
import { isNotFoundError } from '@common/utils';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    name: string,
    tx?: TransactionClient,
  ): Promise<WorkspaceEntity> {
    const client = tx ?? this.prisma;
    const workspace = await client.workspace.create({
      data: { name, ownerId },
    });

    return this.mapToEntity(workspace);
  }

  async findById(id: string): Promise<WorkspaceEntity | null> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    });

    if (!workspace) {
      return null;
    }

    return this.mapToEntity(workspace);
  }

  async findByIds(ids: string[]): Promise<WorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const workspaces = await this.prisma.workspace.findMany({
      where: { id: { in: ids } },
    });
    const byId = new Map(
      workspaces.map((workspace) => [workspace.id, workspace]),
    );

    return ids
      .map((id) => byId.get(id))
      .filter((workspace): workspace is Workspace => workspace !== undefined)
      .map((workspace) => this.mapToEntity(workspace));
  }

  async findAllByUserId(userId: string): Promise<WorkspaceEntity[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((membership) =>
      this.mapToEntity(membership.workspace),
    );
  }

  async countOwnedBy(userId: string): Promise<number> {
    return this.prisma.workspace.count({
      where: { ownerId: userId },
    });
  }

  async update(
    id: string,
    data: Prisma.WorkspaceUpdateInput,
  ): Promise<WorkspaceEntity | null> {
    const workspace = await this.prisma.workspace
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

    return workspace ? this.mapToEntity(workspace) : null;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.workspace.delete({
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

  private mapToEntity(workspace: Workspace): WorkspaceEntity {
    return new WorkspaceEntity(
      workspace.id,
      workspace.name,
      workspace.ownerId,
      workspace.isPublic,
      workspace.createdAt,
    );
  }
}
