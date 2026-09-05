import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { RedisClient } from '../../common/providers/redis-client';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { WorkspaceMemberEntity } from '../workspaces/entities/workspace-member.entity';
import { WorkspaceInvitesRepository } from './workspace-invites.repository';
import { WorkspaceInviteEntity } from './entities/workspace-invite.entity';
import { WorkspaceInviteSummaryEntity } from './entities/workspace-invite-summary.entity';
import {
  WorkspaceInviteType,
  StoredWorkspaceInvite,
} from './types/workspace-invite.types';

const WORKSPACE_INVITE_KEY_PREFIX = 'workspace_invite:';

const WORKSPACE_INVITE_ROLES: readonly Role[] = [Role.VIEWER, Role.EDITOR];

interface ConsumedWorkspaceInvite {
  raw: string;
  stored: StoredWorkspaceInvite;
  remainingTtl: number;
}

@Injectable()
export class WorkspaceInvitesService {
  private readonly logger = new Logger(WorkspaceInvitesService.name);

  constructor(
    private readonly invitesRepository: WorkspaceInvitesRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly redis: RedisClient,
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
    const tokenHash = this.hashToken(token);

    if (type === WorkspaceInviteType.TEMPORARY) {
      const ttlSeconds = this.configService.get<number>(
        'INVITE_TTL_SECONDS',
        86400,
      );
      const stored: StoredWorkspaceInvite = {
        workspaceId,
        role,
        createdBy: actorId,
      };

      await this.redis.set(
        WORKSPACE_INVITE_KEY_PREFIX + tokenHash,
        JSON.stringify(stored),
        'EX',
        ttlSeconds,
      );

      return new WorkspaceInviteEntity(
        token,
        this.buildUrl(token),
        type,
        role,
        new Date(Date.now() + ttlSeconds * 1000),
      );
    }

    await this.assertInviteLimitNotReached(workspaceId);
    await this.invitesRepository.create(workspaceId, actorId, tokenHash, role);

    return new WorkspaceInviteEntity(
      token,
      this.buildUrl(token),
      type,
      role,
      null,
    );
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

  async redeem(userId: string, token: string): Promise<WorkspaceMemberEntity> {
    const tokenHash = this.hashToken(token);
    const key = WORKSPACE_INVITE_KEY_PREFIX + tokenHash;

    const consumed = await this.consumeTemporaryInvite(key);

    let workspaceId: string;
    let role: Role;

    if (consumed) {
      workspaceId = consumed.stored.workspaceId;
      role = consumed.stored.role;
    } else {
      const invite = await this.invitesRepository.findByTokenHash(tokenHash);
      if (!invite) {
        throw new NotFoundException('Invite is invalid or expired');
      }
      workspaceId = invite.workspaceId;
      role = invite.role;
    }

    try {
      return await this.workspacesService.addMemberViaInvite(
        workspaceId,
        userId,
        role,
      );
    } catch (error) {
      if (consumed) {
        await this.restoreInvite(key, consumed);
      }
      throw error;
    }
  }

  private async consumeTemporaryInvite(
    key: string,
  ): Promise<ConsumedWorkspaceInvite | null> {
    let remainingTtl: number;
    let raw: string | null;

    try {
      remainingTtl = await this.redis.ttl(key);
      raw = await this.redis.getdel(key);
    } catch (error) {
      this.logger.warn(
        'Redis is unavailable, falling back to database invites',
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }

    if (!raw) {
      return null;
    }

    const stored = this.parseStoredInvite(raw);
    if (!stored) {
      this.logger.error(`Discarded a malformed invite payload at ${key}`);
      return null;
    }

    return { raw, stored, remainingTtl };
  }

  private parseStoredInvite(raw: string): StoredWorkspaceInvite | null {
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const { workspaceId, role, createdBy } = parsed as Record<string, unknown>;

    if (typeof workspaceId !== 'string' || workspaceId.length === 0) {
      return null;
    }
    if (typeof createdBy !== 'string' || createdBy.length === 0) {
      return null;
    }
    if (
      typeof role !== 'string' ||
      !WORKSPACE_INVITE_ROLES.includes(role as Role)
    ) {
      return null;
    }

    return { workspaceId, role: role as Role, createdBy };
  }

  private async restoreInvite(
    key: string,
    consumed: ConsumedWorkspaceInvite,
  ): Promise<void> {
    if (consumed.remainingTtl <= 0) {
      return;
    }

    try {
      await this.redis.set(key, consumed.raw, 'EX', consumed.remainingTtl);
    } catch (error) {
      this.logger.error(
        `Failed to restore a temporary invite at ${key}`,
        error instanceof Error ? error.stack : undefined,
      );
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

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildUrl(token: string): string {
    const frontUrl = this.configService
      .get<string>('FRONT_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');

    return `${frontUrl}/join/${token}`;
  }
}
