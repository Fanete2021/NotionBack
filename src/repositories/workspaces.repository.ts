import { Injectable } from '@nestjs/common';
import { Prisma, Workspace, WorkspaceMember } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceMemberEntity } from '../entities/workspace-member.entity';
import { WorkspaceEntity } from '../entities/workspace.entity';

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, name: string): Promise<WorkspaceEntity> {
    const result = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name, ownerId },
      });

      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: ownerId, role: 'OWNER' },
      });

      return workspace;
    });

    return this.mapToEntity(result);
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
        if (this.isNotFoundError(error)) {
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
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async addMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberEntity> {
    const member = await this.prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      update: {},
      create: { workspaceId, userId, role: 'MEMBER' },
    });

    return this.mapMemberToEntity(member);
  }

  async removeMember(workspaceId: string, userId: string): Promise<boolean> {
    try {
      await this.prisma.workspaceMember.delete({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
      });
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async findMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberEntity | null> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (!member) {
      return null;
    }

    return this.mapMemberToEntity(member);
  }

  private isNotFoundError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
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

  private mapMemberToEntity(member: WorkspaceMember): WorkspaceMemberEntity {
    return new WorkspaceMemberEntity(
      member.id,
      member.workspaceId,
      member.userId,
      member.role,
      member.createdAt,
    );
  }
}
