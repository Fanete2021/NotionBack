import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Role } from '@prisma/client';
import { RedisClient } from '@common/providers';
import {
  WORKSPACE_INVITE_INDEX_PREFIX,
  WORKSPACE_INVITE_KEY_PREFIX,
  WORKSPACE_INVITE_ROLES,
} from '@modules/workspace-invites/constants';
import {
  ConsumedWorkspaceInvite,
  StoredWorkspaceInvite,
  TemporaryInviteSummary,
} from '@modules/workspace-invites/types';

@Injectable()
export class TemporaryInviteStore {
  constructor(
    private readonly redis: RedisClient,
    @InjectPinoLogger(TemporaryInviteStore.name)
    private readonly logger: PinoLogger,
  ) {}

  async save(
    token: string,
    stored: StoredWorkspaceInvite,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis
      .multi()
      .set(this.key(token), JSON.stringify(stored), 'EX', ttlSeconds)
      .sadd(this.indexKey(stored.workspaceId), token)
      .expire(this.indexKey(stored.workspaceId), ttlSeconds, 'GT')
      .exec();
  }

  async listByWorkspace(
    workspaceId: string,
  ): Promise<TemporaryInviteSummary[]> {
    const indexKey = this.indexKey(workspaceId);
    let tokens: string[];

    try {
      tokens = await this.redis.smembers(indexKey);
    } catch (error) {
      this.logger.warn(
        'Redis is unavailable, temporary invites are omitted from the list',
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }

    if (tokens.length === 0) {
      return [];
    }

    const summaries: TemporaryInviteSummary[] = [];
    const staleTokens: string[] = [];

    for (const token of tokens) {
      const key = this.key(token);
      let raw: string | null;
      let ttl: number;

      try {
        [raw, ttl] = await Promise.all([
          this.redis.get(key),
          this.redis.ttl(key),
        ]);
      } catch (error) {
        this.logger.warn(
          `Failed to read a temporary invite at ${key}`,
          error instanceof Error ? error.stack : undefined,
        );
        continue;
      }

      if (!raw || ttl <= 0) {
        staleTokens.push(token);
        continue;
      }

      const stored = this.parseStoredInvite(raw);
      if (!stored) {
        staleTokens.push(token);
        continue;
      }

      summaries.push({
        token,
        role: stored.role,
        createdBy: stored.createdBy,
        createdAt: new Date(stored.createdAt),
        expiresAt: new Date(Date.now() + ttl * 1000),
      });
    }

    await this.dropStale(indexKey, staleTokens);

    return summaries.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  async consume(token: string): Promise<ConsumedWorkspaceInvite | null> {
    const key = this.key(token);
    let remainingTtl: number;
    let raw: string | null;

    try {
      remainingTtl = await this.redis.ttl(key);
      raw = await this.redis.getdel(key);
    } catch (error: unknown) {
      this.logger.warn(
        { action: 'invite_consume', reason: 'redis_unavailable', err: error },
        'falling back to database invites',
      );
      return null;
    }

    if (!raw) {
      return null;
    }

    const stored = this.parseStoredInvite(raw);
    if (!stored) {
      this.logger.warn(
        { action: 'invite_consume', reason: 'malformed_payload', key },
        'discarded a malformed invite payload',
      );
      return null;
    }

    await this.dropStale(this.indexKey(stored.workspaceId), [token]);

    return { raw, stored, remainingTtl };
  }

  async restore(
    token: string,
    consumed: ConsumedWorkspaceInvite,
  ): Promise<void> {
    if (consumed.remainingTtl <= 0) {
      return;
    }

    try {
      await this.redis
        .multi()
        .set(this.key(token), consumed.raw, 'EX', consumed.remainingTtl)
        .sadd(this.indexKey(consumed.stored.workspaceId), token)
        .expire(
          this.indexKey(consumed.stored.workspaceId),
          consumed.remainingTtl,
          'GT',
        )
        .exec();
    } catch (error: unknown) {
      this.logger.error(
        { action: 'invite_restore', key: this.key(token), err: error },
        'failed to restore a temporary invite',
      );
    }
  }

  private async dropStale(indexKey: string, tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    try {
      await this.redis.srem(indexKey, ...tokens);
    } catch (error) {
      this.logger.warn(
        `Failed to prune the temporary invite index ${indexKey}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private key(token: string): string {
    return WORKSPACE_INVITE_KEY_PREFIX + token;
  }

  private indexKey(workspaceId: string): string {
    return WORKSPACE_INVITE_INDEX_PREFIX + workspaceId;
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

    const { workspaceId, role, createdBy, createdAt } = parsed as Record<
      string,
      unknown
    >;

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

    return {
      workspaceId,
      role: role as Role,
      createdBy,
      createdAt: typeof createdAt === 'string' ? createdAt : '',
    };
  }
}
