import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RedisClient } from '@common/providers';
import {
  WORKSPACE_INVITE_KEY_PREFIX,
  WORKSPACE_INVITE_ROLES,
} from '@modules/workspace-invites/constants';
import {
  ConsumedWorkspaceInvite,
  StoredWorkspaceInvite,
} from '@modules/workspace-invites/types';

@Injectable()
export class TemporaryInviteStore {
  private readonly logger = new Logger(TemporaryInviteStore.name);

  constructor(private readonly redis: RedisClient) {}

  async save(
    tokenHash: string,
    stored: StoredWorkspaceInvite,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(
      this.key(tokenHash),
      JSON.stringify(stored),
      'EX',
      ttlSeconds,
    );
  }

  async consume(tokenHash: string): Promise<ConsumedWorkspaceInvite | null> {
    const key = this.key(tokenHash);
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

  async restore(
    tokenHash: string,
    consumed: ConsumedWorkspaceInvite,
  ): Promise<void> {
    if (consumed.remainingTtl <= 0) {
      return;
    }

    try {
      await this.redis.set(
        this.key(tokenHash),
        consumed.raw,
        'EX',
        consumed.remainingTtl,
      );
    } catch (error) {
      this.logger.error(
        `Failed to restore a temporary invite at ${this.key(tokenHash)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private key(tokenHash: string): string {
    return WORKSPACE_INVITE_KEY_PREFIX + tokenHash;
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
}
