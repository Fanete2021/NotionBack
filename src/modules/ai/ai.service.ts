import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AiAction } from './ai-action';
import { CompleteAiDto } from './dto';
import { AiCompleteEntity } from './entities';

const GROQ_CHAT_COMPLETIONS_URL =
  'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const AI_REQUEST_TIMEOUT_MS = 30_000;

const AI_INSTRUCTIONS: Record<AiAction, string> = {
  [AiAction.WRITE]:
    'Напиши текст по запросу пользователя. Верни только готовый текст, без пояснений.',
  [AiAction.IMPROVE]:
    'Улучши ясность и стиль текста пользователя. Верни только улучшенный текст, без пояснений.',
  [AiAction.SUMMARIZE]:
    'Кратко перескажи текст пользователя. Верни только пересказ, без пояснений.',
  [AiAction.FIX_GRAMMAR]:
    'Исправь грамматику и орфографию текста пользователя. Верни только исправленный текст, без пояснений.',
  [AiAction.TRANSLATE]:
    'Переведи текст пользователя. Если язык перевода не указан в тексте, переведи на русский. Верни только перевод, без пояснений.',
};

type TimeoutHandle = {
  signal: AbortSignal;
  cancel: () => void;
};

@Injectable()
export class AiService {
  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(AiService.name)
    private readonly logger: PinoLogger,
  ) {}

  async complete(
    dto: CompleteAiDto,
    signal?: AbortSignal,
  ): Promise<AiCompleteEntity> {
    let text = '';

    for await (const delta of this.stream(dto, signal)) {
      text += delta;
    }

    return new AiCompleteEntity(dto.action, text);
  }

  async *stream(
    dto: CompleteAiDto,
    externalSignal?: AbortSignal,
  ): AsyncGenerator<string> {
    const timeout = this.startTimeout();
    const signal = externalSignal
      ? AbortSignal.any([externalSignal, timeout.signal])
      : timeout.signal;

    try {
      const body = await this.open(dto, signal, timeout.signal);
      yield* this.readDeltas(body, dto.action, timeout.signal);
    } finally {
      timeout.cancel();
    }
  }

  private startTimeout(): TimeoutHandle {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const reason = new Error('AI provider request timed out');
      reason.name = 'TimeoutError';
      controller.abort(reason);
    }, AI_REQUEST_TIMEOUT_MS);

    return {
      signal: controller.signal,
      cancel: (): void => {
        clearTimeout(timer);
      },
    };
  }

  private async open(
    dto: CompleteAiDto,
    signal: AbortSignal,
    timeoutSignal: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('AI provider is not configured');
    }

    try {
      const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          stream: true,
          messages: [
            { role: 'system', content: AI_INSTRUCTIONS[dto.action] },
            { role: 'user', content: dto.text },
          ],
        }),
        signal,
      });

      if (!response.ok || response.body === null) {
        this.logger.warn(
          { action: dto.action, status: response.status },
          'ai provider request failed',
        );
        if (response.body) {
          await response.body.cancel();
        }
        throw new BadGatewayException('AI provider request failed');
      }

      return response.body;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw this.toHttpException(error, dto.action, timeoutSignal);
    }
  }

  private async *readDeltas(
    body: ReadableStream<Uint8Array>,
    action: AiAction,
    timeoutSignal: AbortSignal,
  ): AsyncGenerator<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      let finished = false;
      while (!finished) {
        const { done, value } = await reader.read();
        finished = done;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }
        if (done) {
          buffer += decoder.decode();
        }

        const lines = buffer.split('\n');
        buffer = done ? '' : (lines.pop() ?? '');
        for (const line of lines) {
          const delta = this.deltaFromLine(line);
          if (delta) {
            yield delta;
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw this.toHttpException(error, action, timeoutSignal);
    } finally {
      reader.releaseLock();
    }
  }

  private deltaFromLine(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
      return null;
    }

    const payload = trimmed.slice('data:'.length).trim();
    if (!payload || payload === '[DONE]') {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      throw new BadGatewayException('AI provider request failed');
    }

    if (this.isProviderError(parsed)) {
      this.logger.warn('ai provider stream failed');
      throw new BadGatewayException('AI provider request failed');
    }

    return this.readDeltaContent(parsed);
  }

  private isProviderError(payload: unknown): boolean {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      payload.error != null
    );
  }

  private readDeltaContent(payload: unknown): string | null {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('choices' in payload)
    ) {
      return null;
    }

    const choices = payload.choices;
    if (!Array.isArray(choices)) {
      return null;
    }

    const choice: unknown = choices[0];
    if (typeof choice !== 'object' || choice === null || !('delta' in choice)) {
      return null;
    }

    const delta = choice.delta;
    if (typeof delta !== 'object' || delta === null || !('content' in delta)) {
      return null;
    }

    const content = delta.content;
    return typeof content === 'string' && content.length > 0 ? content : null;
  }

  private toHttpException(
    error: unknown,
    action: AiAction,
    timeoutSignal: AbortSignal,
  ): HttpException {
    if (this.isTimeout(error, timeoutSignal)) {
      this.logger.warn({ action }, 'ai provider request timed out');
      return new GatewayTimeoutException('AI provider request timed out');
    }

    if (this.isAbort(error)) {
      return new BadGatewayException('AI provider request failed');
    }

    this.logger.error({ action, err: error }, 'ai provider request failed');
    return new BadGatewayException('AI provider request failed');
  }

  private isTimeout(error: unknown, timeoutSignal: AbortSignal): boolean {
    if (timeoutSignal.aborted) {
      const reason: unknown = timeoutSignal.reason;
      if (reason instanceof Error && reason.name === 'TimeoutError') {
        return true;
      }
    }

    return error instanceof Error && error.name === 'TimeoutError';
  }

  private isAbort(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }
}

export { AI_REQUEST_TIMEOUT_MS };
