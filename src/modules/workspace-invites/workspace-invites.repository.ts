import { Injectable } from '@nestjs/common';
import { Prisma, Role, WorkspaceInvite } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceInviteSummaryEntity } from './entities/workspace-invite-summary.entity';

@Injectable()
export class WorkspaceInvitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    createdBy: string,
    tokenHash: string,
    role: Role,
  ): Promise<WorkspaceInviteSummaryEntity> {
    const invite = await this.prisma.workspaceInvite.create({
      data: { workspaceId, createdBy, tokenHash, role },
    });

    return this.mapToEntity(invite);
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<WorkspaceInviteSummaryEntity | null> {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { tokenHash },
    });

    if (!invite) {
      return null;
    }

    return this.mapToEntity(invite);
  }

  async findAllByWorkspaceId(
    workspaceId: string,
  ): Promise<WorkspaceInviteSummaryEntity[]> {
    const invites = await this.prisma.workspaceInvite.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });

    return invites.map((invite) => this.mapToEntity(invite));
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

  private mapToEntity(invite: WorkspaceInvite): WorkspaceInviteSummaryEntity {
    return new WorkspaceInviteSummaryEntity(
      invite.id,
      invite.workspaceId,
      invite.role,
      invite.createdBy,
      invite.createdAt,
    );
  }
}
