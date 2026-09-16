import { Injectable } from '@nestjs/common';
import { Prisma, Role, WorkspaceInvite } from '@prisma/client';
import { PrismaService } from '../../prisma';

@Injectable()
export class WorkspaceInvitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    createdBy: string,
    token: string,
    role: Role,
  ): Promise<WorkspaceInvite> {
    return this.prisma.workspaceInvite.create({
      data: { workspaceId, createdBy, token, role },
    });
  }

  async findByToken(token: string): Promise<WorkspaceInvite | null> {
    return this.prisma.workspaceInvite.findUnique({
      where: { token },
    });
  }

  async findAllByWorkspaceId(workspaceId: string): Promise<WorkspaceInvite[]> {
    return this.prisma.workspaceInvite.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countByWorkspaceId(workspaceId: string): Promise<number> {
    return this.prisma.workspaceInvite.count({
      where: { workspaceId },
    });
  }

  async deleteById(workspaceId: string, inviteId: string): Promise<boolean> {
    try {
      await this.prisma.workspaceInvite.delete({
        where: { id: inviteId, workspaceId },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return false;
      }
      throw error;
    }
  }
}
