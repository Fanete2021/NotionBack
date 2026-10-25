import { timingSafeEqual } from 'crypto';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Public } from '@common/decorators';
import { TelegramService } from './telegram.service';
import type { TelegramUpdate } from './types';

const SECRET_HEADER = 'x-telegram-bot-api-secret-token';

@ApiExcludeController()
@Controller('telegram')
export class TelegramWebhookController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
    @InjectPinoLogger(TelegramWebhookController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Body() update: TelegramUpdate,
    @Headers(SECRET_HEADER) secret?: string,
  ): Promise<{ ok: true }> {
    this.verifySecret(secret);

    try {
      await this.telegramService.handleUpdate(update);
    } catch (error: unknown) {
      // Отвечаем 200, чтобы Telegram не ретраил бесконечно; ошибку логируем.
      this.logger.error(
        { action: 'tg_webhook_error', err: error },
        'telegram webhook processing failed',
      );
    }

    return { ok: true };
  }

  private verifySecret(secret?: string): void {
    const expected =
      this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET') ?? '';
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    if (!expected) {
      if (isProduction) {
        throw new UnauthorizedException('Webhook secret is not configured');
      }
      return;
    }

    if (!secret || !safeEqual(secret, expected)) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }
}

function safeEqual(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
