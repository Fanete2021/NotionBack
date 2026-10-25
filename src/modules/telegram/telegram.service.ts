import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TelegramApiService } from './telegram-api.service';
import { TelegramRepository } from './telegram.repository';
import { ConnectCodeEntity, TelegramStatusEntity } from './entities';
import { TelegramUpdate } from './types';

const START_COMMAND = '/start';

@Injectable()
export class TelegramService {
  constructor(
    private readonly telegramRepository: TelegramRepository,
    private readonly telegramApi: TelegramApiService,
    private readonly configService: ConfigService,
    @InjectPinoLogger(TelegramService.name)
    private readonly logger: PinoLogger,
  ) {}

  async createConnectCode(userId: string): Promise<ConnectCodeEntity> {
    const ttlSeconds = this.configService.get<number>(
      'TELEGRAM_CONNECT_CODE_TTL_SECONDS',
    );
    const expiresAt = new Date(Date.now() + (ttlSeconds ?? 900) * 1000);
    const code = randomBytes(24).toString('base64url');

    await this.telegramRepository.deleteUnusedCodesByUser(userId);
    await this.telegramRepository.createCode({ code, userId, expiresAt });

    this.logger.info(
      { action: 'tg_connect_code_created', userId },
      'telegram connect code created',
    );

    return new ConnectCodeEntity({
      code,
      deepLink: this.buildDeepLink(code),
      expiresAt,
    });
  }

  async disconnect(userId: string): Promise<void> {
    await this.telegramRepository.disconnectUser(userId);
    this.logger.info(
      { action: 'tg_disconnect', userId },
      'telegram disconnected',
    );
  }

  async getStatus(userId: string): Promise<TelegramStatusEntity> {
    const user = await this.telegramRepository.findUserTelegram(userId);

    return new TelegramStatusEntity({
      isConnected: Boolean(user?.telegramChatId),
      username: user?.telegramUsername ?? null,
      connectedAt: user?.telegramConnectedAt ?? null,
    });
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    const text = message?.text?.trim();

    if (!message || !text || !text.startsWith(START_COMMAND)) {
      return;
    }

    const chatId = String(message.chat.id);
    const username = message.chat.username ?? message.from?.username ?? null;
    const payload = text.slice(START_COMMAND.length).trim();

    if (!payload) {
      await this.telegramApi.sendMessage(
        chatId,
        'Привет! Чтобы привязать аккаунт, откройте приложение → Настройки уведомлений → «Подключить Telegram» и перейдите по ссылке оттуда.',
      );
      return;
    }

    const userId = await this.telegramRepository.redeemCode(payload, {
      chatId,
      username,
    });

    if (!userId) {
      await this.telegramApi.sendMessage(
        chatId,
        '❌ Код привязки недействителен или истёк. Сгенерируйте новый в настройках приложения.',
      );
      return;
    }

    this.logger.info(
      { action: 'tg_connected', userId },
      'telegram account connected',
    );

    await this.telegramApi.sendMessage(
      chatId,
      '✅ Telegram подключён! Теперь вы будете получать напоминания о событиях.',
    );
  }

  private buildDeepLink(code: string): string | null {
    const botUsername = this.configService.get<string>('TELEGRAM_BOT_USERNAME');
    if (!botUsername) {
      return null;
    }
    return `https://t.me/${botUsername}?start=${code}`;
  }
}
