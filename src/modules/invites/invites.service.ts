import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { RedisClient } from '../../common/providers/redis-client';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { WorkspaceMemberEntity } from '../workspaces/entities/workspace-member.entity';
import { InvitesRepository } from './invites.repository';
import { WorkspaceInviteEntity } from './entities/workspace-invite.entity';
import { InviteType, StoredInvite } from './types/invite.types';

const INVITE_KEY_PREFIX = 'workspace_invite:';

@Injectable()
export class InvitesService {
  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly redis: RedisClient,
    private readonly configService: ConfigService,
  ) {}

  async create(
    actorId: string,
    workspaceId: string,
    type: InviteType,
    role: Role = Role.EDITOR,
  ): Promise<WorkspaceInviteEntity> {
    await this.workspacesService.assertCanManageMembers(workspaceId, actorId);

    if (role === Role.OWNER || role === Role.ADMIN) {
      throw new ForbiddenException(
        'Invite links can only grant the VIEWER or EDITOR role',
      );
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);

    let expiresAt: Date | null = null;
    if (type === InviteType.TEMPORARY) {
      const ttlSeconds = this.configService.get<number>(
        'INVITE_TTL_SECONDS',
        86400,
      );
      expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      const stored: StoredInvite = { workspaceId, role, createdBy: actorId };
      await this.redis.set(
        INVITE_KEY_PREFIX + tokenHash,
        JSON.stringify(stored),
        'EX',
        ttlSeconds,
      );
    } else {
      await this.invitesRepository.create(
        workspaceId,
        actorId,
        tokenHash,
        role,
      );
    }

    return new WorkspaceInviteEntity(
      token,
      this.buildUrl(token),
      type,
      role,
      expiresAt,
    );
  }

  async redeem(userId: string, token: string): Promise<WorkspaceMemberEntity> {
    const tokenHash = this.hashToken(token);
    const key = INVITE_KEY_PREFIX + tokenHash;

    // Consume atomically (GETDEL) so parallel requests cannot join twice;
    // remaining TTL is read beforehand to restore the link if the join fails.
    const remainingTtl = await this.redis.ttl(key);
    const cached = await this.redis.getdel(key);

    let isTemporary = false;
    let workspaceId: string;
    let role: Role;

    if (cached) {
      const stored = JSON.parse(cached) as StoredInvite;
      workspaceId = stored.workspaceId;
      role = stored.role;
      isTemporary = true;
    } else {
      const invite = await this.invitesRepository.findByTokenHash(tokenHash);
      if (!invite) {
        throw new NotFoundException('Invite is invalid or expired');
      }
      workspaceId = invite.workspaceId;
      role = invite.role;
    }

    try {
      await this.workspacesService.findById(workspaceId);

      const member = await this.invitesRepository.addMember(
        workspaceId,
        userId,
        role,
      );

      return new WorkspaceMemberEntity(
        member.id,
        member.workspaceId,
        member.userId,
        member.role,
        member.createdAt,
      );
    } catch (error) {
      if (isTemporary) {
        await this.restoreInvite(key, cached!, remainingTtl);
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'User is already a member of this workspace',
        );
      }
      throw error;
    }
  }

  private async restoreInvite(
    key: string,
    value: string,
    remainingTtl: number,
  ): Promise<void> {
    if (remainingTtl > 0) {
      await this.redis.set(key, value, 'EX', remainingTtl);
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildUrl(token: string): string {
    const frontUrl = this.configService.get<string>('FRONT_URL')!;
    return `${frontUrl}/join/${token}`;
  }
}
