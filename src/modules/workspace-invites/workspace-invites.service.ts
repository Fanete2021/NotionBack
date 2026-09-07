import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { WorkspaceInvitesRepository } from './workspace-invites.repository';
import { WorkspaceInviteEntity } from './entities/workspace-invite.entity';
import { WorkspaceInviteSummaryEntity } from './entities/workspace-invite-summary.entity';
import { WorkspaceInviteType } from './types/workspace-invite.types';
import { WORKSPACE_INVITE_ROLES } from './constants/workspace-invite.constants';
import { hashInviteToken } from './utils/hash-invite-token';
import { buildInviteUrl } from './utils/build-invite-url';
import { TemporaryInviteStore } from './temporary-invite.store';

@Injectable()
export class WorkspaceInvitesService {
  constructor(
    private readonly invitesRepository: WorkspaceInvitesRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly temporaryInvites: TemporaryInviteStore,
    private readonly configService: ConfigService,
  ) {}

  async create(
    actorId: string,
    workspaceId: string,
    type: WorkspaceInviteType,
    role: Role = Role.VIEWER,
  ): Promise<WorkspaceInviteEntity> {
    await this.workspacesService.assertCanManageMembers(workspaceId, actorId);

    if (!WORKSPACE_INVITE_ROLES.includes(role)) {
      throw new ForbiddenException(
        'Invite links can only grant the VIEWER or EDITOR role',
      );
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashInviteToken(token);
    const url = this.buildUrl(token);

    if (type === WorkspaceInviteType.TEMPORARY) {
      const ttlSeconds = this.configService.get<number>(
        'INVITE_TTL_SECONDS',
        86400,
      );

      await this.temporaryInvites.save(
        tokenHash,
        { workspaceId, role, createdBy: actorId },
        ttlSeconds,
      );

      return new WorkspaceInviteEntity(
        token,
        url,
        type,
        role,
        new Date(Date.now() + ttlSeconds * 1000),
      );
    }

    await this.assertInviteLimitNotReached(workspaceId);
    await this.invitesRepository.create(workspaceId, actorId, tokenHash, role);

    return new WorkspaceInviteEntity(token, url, type, role, null);
  }

  async list(
    actorId: string,
    workspaceId: string,
  ): Promise<WorkspaceInviteSummaryEntity[]> {
    await this.workspacesService.assertCanManageMembers(workspaceId, actorId);

    return this.invitesRepository.findAllByWorkspaceId(workspaceId);
  }

  async revoke(
    actorId: string,
    workspaceId: string,
    inviteId: string,
  ): Promise<void> {
    await this.workspacesService.assertCanManageMembers(workspaceId, actorId);

    const revoked = await this.invitesRepository.deleteById(
      workspaceId,
      inviteId,
    );
    if (!revoked) {
      throw new NotFoundException('Invite not found');
    }
  }

  private async assertInviteLimitNotReached(
    workspaceId: string,
  ): Promise<void> {
    const maxInvites = this.configService.get<number>(
      'MAX_INVITES_PER_WORKSPACE',
      10,
    );

    const activeInvites =
      await this.invitesRepository.countByWorkspaceId(workspaceId);

    if (activeInvites >= maxInvites) {
      throw new ForbiddenException(
        `Permanent invite limit reached (max ${maxInvites} per workspace), revoke an existing link first`,
      );
    }
  }

  private buildUrl(token: string): string {
    const frontUrl = this.configService.get<string>(
      'FRONT_URL',
      'http://localhost:3000',
    );

    return buildInviteUrl(frontUrl, token);
  }
}
