import { Injectable } from '@nestjs/common';
import { Prisma, Workspace, WorkspaceMember } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { isNotFoundError } from '@common/utils';

type TransactionClient = Prisma.TransactionClient;

type MembershipWithWorkspace = WorkspaceMember & { workspace: Workspace };

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    name: string,
    tx?: TransactionClient,
  ): Promise<Workspace> {
    const client = tx ?? this.prisma;
    return client.workspace.create({
      data: { name, ownerId },
    });
  }

  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
    });
  }

  async findByIds(ids: string[]): Promise<Workspace[]> {
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
      .filter((workspace): workspace is Workspace => workspace !== undefined);
  }

  async findAllByUserId(userId: string): Promise<MembershipWithWorkspace[]> {
    return this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countOwnedBy(userId: string): Promise<number> {
    return this.prisma.workspace.count({
      where: { ownerId: userId },
    });
  }

  async update(
    id: string,
    data: Prisma.WorkspaceUpdateInput,
  ): Promise<Workspace | null> {
    return this.prisma.workspace
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
}
