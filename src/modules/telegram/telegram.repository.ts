import { Injectable } from '@nestjs/common';
import { TelegramConnectCode, User } from '@prisma/client';
import { PrismaService } from '../../prisma';

export type TelegramUserFields = Pick<
  User,
  'id' | 'telegramChatId' | 'telegramUsername' | 'telegramConnectedAt'
>;

const TELEGRAM_USER_SELECT = {
  id: true,
  telegramChatId: true,
  telegramUsername: true,
  telegramConnectedAt: true,
} as const;

@Injectable()
export class TelegramRepository {
  constructor(private readonly prisma: PrismaService) {}

  createCode(data: {
    code: string;
    userId: string;
    expiresAt: Date;
  }): Promise<TelegramConnectCode> {
    return this.prisma.telegramConnectCode.create({ data });
  }

  deleteUnusedCodesByUser(userId: string): Promise<{ count: number }> {
    return this.prisma.telegramConnectCode.deleteMany({
      where: { userId, usedAt: null },
    });
  }

  async redeemCode(
    code: string,
    data: { chatId: string; username: string | null },
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.telegramConnectCode.updateMany({
        where: { code, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        return null;
      }

      const record = await tx.telegramConnectCode.findUnique({
        where: { code },
      });
      if (!record) {
        return null;
      }

      await tx.user.updateMany({
        where: { telegramChatId: data.chatId },
        data: {
          telegramChatId: null,
          telegramUsername: null,
          telegramConnectedAt: null,
        },
      });
      await tx.user.update({
        where: { id: record.userId },
        data: {
          telegramChatId: data.chatId,
          telegramUsername: data.username,
          telegramConnectedAt: new Date(),
        },
      });

      return record.userId;
    });
  }

  async disconnectUser(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramConnectedAt: null,
      },
    });
  }

  findUserTelegram(userId: string): Promise<TelegramUserFields | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: TELEGRAM_USER_SELECT,
    });
  }
}
