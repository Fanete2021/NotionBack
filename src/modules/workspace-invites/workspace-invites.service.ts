import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Role, WorkspaceInvite } from '@prisma/client';
import { randomBytes } from 'crypto';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { WorkspaceInvitesRepository } from '@modules/workspace-invites/workspace-invites.repository';
import { WorkspaceInviteEntity } from '@modules/workspace-invites/entities';
import { WorkspaceInviteSummaryEntity } from '@modules/workspace-invites/entities';
import {
  TemporaryInviteSummary,
  WorkspaceInviteType,
} from '@modules/workspace-invites/types';
import { WORKSPACE_INVITE_ROLES } from '@modules/workspace-invites/constants';
import { buildInviteUrl } from '@modules/workspace-invites/utils';
import { TemporaryInviteStore } from '@modules/workspace-invites/temporary-invite.store';

@Injectable()
export class WorkspaceInvitesService {
  constructor(
    private readonly invitesRepository: WorkspaceInvitesRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly temporaryInvites: TemporaryInviteStore,
    private readonly configService: ConfigService,
    @InjectPinoLogger(WorkspaceInvitesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(
    actorId: string,
    workspaceId: string,
    type: WorkspaceInviteType,
    role: Role = Role.VIEWER,
  ): Promise<WorkspaceInviteEntity> {
    await this.workspacesService.assertCanManageMembers(workspaceId, actorId);

    if (!WORKSPACE_INVITE_ROLES.includes(role)) {
      this.logger.warn(
        {
          workspaceId,
          userId: actorId,
          action: 'invite_create',
          reason: 'role_not_allowed',
          role,
        },
        'invite create rejected',
      );
      throw new ForbiddenException(
        'Invite links can only grant the VIEWER or EDITOR role',
      );
    }

    const token = randomBytes(32).toString('base64url');
    const url = this.buildUrl(token);

    if (type === WorkspaceInviteType.TEMPORARY) {
      const ttlSeconds = this.configService.get<number>(
        'INVITE_TTL_SECONDS',
        86400,
      );

      await this.temporaryInvites.save(
        token,
        {
          workspaceId,
          role,
          createdBy: actorId,
          createdAt: new Date().toISOString(),
        },
        ttlSeconds,
      );

      this.logger.info(
        { workspaceId, userId: actorId, action: 'invite_create', type, role },
        'invite created',
      );

      return new WorkspaceInviteEntity(
        token,
        url,
        type,
        role,
        new Date(Date.now() + ttlSeconds * 1000),
      );
    }

    await this.assertInviteLimitNotReached(workspaceId, actorId);
    await this.invitesRepository.create(workspaceId, actorId, token, role);

    this.logger.info(
      { workspaceId, userId: actorId, action: 'invite_create', type, role },
      'invite created',
    );

    return new WorkspaceInviteEntity(token, url, type, role, null);
  }

  async list(
    actorId: string,
    workspaceId: string,
  ): Promise<WorkspaceInviteSummaryEntity[]> {
    await this.workspacesService.assertCanManageMembers(workspaceId, actorId);

    const [permanent, temporary] = await Promise.all([
      this.invitesRepository.findAllByWorkspaceId(workspaceId),
      this.temporaryInvites.listByWorkspace(workspaceId),
    ]);

    return [
      ...permanent.map((invite) => this.toPermanentSummary(invite)),
      ...temporary.map((invite) =>
        this.toTemporarySummary(workspaceId, invite),
      ),
    ];
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

    this.logger.info(
      { workspaceId, inviteId, userId: actorId, action: 'invite_revoke' },
      'invite revoked',
    );
  }

  private toPermanentSummary(
    invite: WorkspaceInvite,
  ): WorkspaceInviteSummaryEntity {
    return new WorkspaceInviteSummaryEntity(
      invite.id,
      invite.workspaceId,
      WorkspaceInviteType.PERMANENT,
      invite.role,
      invite.createdBy,
      invite.createdAt,
      invite.token,
      null,
    );
  }

  private toTemporarySummary(
    workspaceId: string,
    invite: TemporaryInviteSummary,
  ): WorkspaceInviteSummaryEntity {
    return new WorkspaceInviteSummaryEntity(
      invite.token,
      workspaceId,
      WorkspaceInviteType.TEMPORARY,
      invite.role,
      invite.createdBy,
      invite.createdAt,
      invite.token,
      invite.expiresAt,
    );
  }

  private async assertInviteLimitNotReached(
    workspaceId: string,
    actorId: string,
  ): Promise<void> {
    const maxInvites = this.configService.get<number>(
      'MAX_INVITES_PER_WORKSPACE',
      10,
    );

    const activeInvites =
      await this.invitesRepository.countByWorkspaceId(workspaceId);

    if (activeInvites >= maxInvites) {
      this.logger.warn(
        {
          workspaceId,
          userId: actorId,
          action: 'invite_create',
          reason: 'invite_limit_reached',
        },
        'invite create rejected',
      );
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
