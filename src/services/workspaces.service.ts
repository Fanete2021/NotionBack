import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';
import { WorkspacesRepository } from '../repositories/workspaces.repository';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { WorkspaceMemberEntity } from '../entities/workspace-member.entity';

@Injectable()
export class WorkspacesService {
  constructor(private readonly workspacesRepository: WorkspacesRepository) {}

  async create(ownerId: string, name: string): Promise<WorkspaceEntity> {
    return this.workspacesRepository.create(ownerId, name);
  }

  async findById(id: string): Promise<WorkspaceEntity> {
    const workspace = await this.workspacesRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async findAllByUserId(userId: string): Promise<WorkspaceEntity[]> {
    return this.workspacesRepository.findAllByUserId(userId);
  }

  async update(
    id: string,
    payload: Prisma.WorkspaceUpdateInput,
  ): Promise<WorkspaceEntity> {
    const workspace = await this.workspacesRepository.update(id, payload);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.workspacesRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Workspace not found');
    }
  }

  async addMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberEntity> {
    return this.workspacesRepository.addMember(workspaceId, userId);
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const removed = await this.workspacesRepository.removeMember(
      workspaceId,
      userId,
    );
    if (!removed) {
      throw new NotFoundException('Membership not found');
    }
  }

  async assertMemberOf(workspaceId: string, userId: string): Promise<void> {
    const workspace = await this.workspacesRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
  }

  async assertOwner(workspaceId: string, userId: string): Promise<void> {
    const membership = await this.workspacesRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }

    if (membership.role !== Role.OWNER) {
      throw new ForbiddenException('Only the workspace owner can do this');
    }
  }
}
