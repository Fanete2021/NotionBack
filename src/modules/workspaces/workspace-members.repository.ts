import { Injectable } from '@nestjs/common';
import { Prisma, Role, WorkspaceMember } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { WorkspaceMemberEntity } from '@modules/workspaces/entities';
import { isNotFoundError } from '@common/utils';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class WorkspaceMembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addMember(
    workspaceId: string,
    userId: string,
    role: Role = Role.EDITOR,
    tx?: TransactionClient,
  ): Promise<WorkspaceMemberEntity> {
    const client = tx ?? this.prisma;
    const member = await client.workspaceMember.create({
      data: { workspaceId, userId, role },
    });

    return this.mapToEntity(member);
  }

  async findAllByUserId(userId: string): Promise<WorkspaceMemberEntity[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((member) => this.mapToEntity(member));
  }

  async findAllMembers(workspaceId: string): Promise<WorkspaceMemberEntity[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((member) => this.mapToEntity(member));
  }

  async changeRole(
    workspaceId: string,
    userId: string,
    role: Role,
  ): Promise<WorkspaceMemberEntity | null> {
    const member = await this.prisma.workspaceMember
      .update({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
        data: { role },
      })
      .catch((error) => {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      });

    return member ? this.mapToEntity(member) : null;
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
      if (isNotFoundError(error)) {
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

    return this.mapToEntity(member);
  }

  private mapToEntity(member: WorkspaceMember): WorkspaceMemberEntity {
    return new WorkspaceMemberEntity(
      member.id,
      member.workspaceId,
      member.userId,
      member.role,
      member.createdAt,
    );
  }
}
