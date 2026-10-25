import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class TelegramApiService {
  private readonly token: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(TelegramApiService.name)
    private readonly logger: PinoLogger,
  ) {
    this.token = this.configService.get<string>('TELEGRAM_BOT_TOKEN') ?? '';
  }

  get isConfigured(): boolean {
    return this.token.length > 0;
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(
        { action: 'tg_send_skip', reason: 'no_token' },
        'telegram token is not configured, message skipped',
      );
      return false;
    }

    let response: Response;
    try {
      response = await fetch(this.apiUrl('sendMessage'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
    } catch (error: unknown) {
      this.logger.error(
        { action: 'tg_send_error', chatId, err: error },
        'telegram sendMessage error',
      );
      throw error;
    }

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        { action: 'tg_send_fail', chatId, status: response.status, body },
        'telegram sendMessage failed',
      );
      throw new Error(`telegram sendMessage failed: ${response.status}`);
    }

    return true;
  }

  async setWebhook(url: string, secretToken?: string): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    const response = await fetch(this.apiUrl('setWebhook'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url,
        secret_token: secretToken || undefined,
        allowed_updates: ['message'],
      }),
    });

    return response.ok;
  }

  private apiUrl(method: string): string {
    return `https://api.telegram.org/bot${this.token}/${method}`;
  }
}
