import { Injectable } from '@nestjs/common';
import { Role, WorkspaceInvite, WorkspaceMember } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    createdBy: string,
    tokenHash: string,
    role: Role,
  ): Promise<WorkspaceInvite> {
    return this.prisma.workspaceInvite.create({
      data: { workspaceId, createdBy, tokenHash, role },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<WorkspaceInvite | null> {
    return this.prisma.workspaceInvite.findUnique({
      where: { tokenHash },
    });
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: Role,
  ): Promise<WorkspaceMember> {
    return this.prisma.workspaceMember.create({
      data: { workspaceId, userId, role },
    });
  }
}
