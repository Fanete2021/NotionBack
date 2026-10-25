import {
  BadGatewayException,
  ConflictException,
  GatewayTimeoutException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { provideMockPinoLogger } from '@common/testing';
import { AiAction } from './ai-action';
import { AiService, AI_IDLE_TIMEOUT_MS } from './ai.service';
import { AiCompleteEntity } from './entities';

describe('AiService', () => {
  let service: AiService;
  let apiKey = 'test-key';
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  const phrases: Record<AiAction, string> = {
    [AiAction.WRITE]: 'Напиши текст',
    [AiAction.IMPROVE]: 'Улучши ясность',
    [AiAction.SUMMARIZE]: 'Кратко перескажи',
    [AiAction.FIX_GRAMMAR]: 'Исправь грамматику',
    [AiAction.TRANSLATE]: 'Переведи текст',
  };

  beforeEach(async () => {
    apiKey = 'test-key';
    fetchMock = jest.spyOn(globalThis, 'fetch');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string): string | undefined =>
              key === 'GROQ_API_KEY' ? apiKey : undefined,
          },
        },
        provideMockPinoLogger(AiService.name),
      ],
    }).compile();

    service = module.get(AiService);
  });

  afterEach(() => {
    fetchMock.mockRestore();
    jest.useRealTimers();
  });

  function mockStream(chunks: Uint8Array[], status = 200): void {
    const ok = status >= 200 && status < 300;
    fetchMock.mockResolvedValue({
      ok,
      status,
      body: ok
        ? new ReadableStream<Uint8Array>({
            start(
              controller: ReadableStreamDefaultController<Uint8Array>,
            ): void {
              for (const chunk of chunks) {
                controller.enqueue(chunk);
              }
              controller.close();
            },
          })
        : null,
    } as Response);
  }

  function encode(value: string): Uint8Array {
    return new TextEncoder().encode(value);
  }

  function requestBody(): {
    model: string;
    stream: boolean;
    messages: Array<{ role: string; content: string }>;
  } {
    const init = fetchMock.mock.calls[0]?.[1];
    const raw = init?.body;
    if (typeof raw !== 'string') {
      throw new Error('expected a string request body');
    }
    return JSON.parse(raw) as {
      model: string;
      stream: boolean;
      messages: Array<{ role: string; content: string }>;
    };
  }

  it.each(Object.values(AiAction))(
    'действие %s возвращает текст модели',
    async (action) => {
      mockStream([
        encode(
          'data: {"choices":[{"delta":{"content":"готово"}}]}\n\ndata: [DONE]\n\n',
        ),
      ]);

      const result = await service.complete({ action, text: 'исходник' });

      expect(result).toEqual(new AiCompleteEntity(action, 'готово'));
      const body = requestBody();
      expect(body.model).toBe('openai/gpt-oss-120b');
      expect(body.stream).toBe(true);
      expect(body.messages[0]?.content.startsWith(phrases[action])).toBe(true);
      expect(body.messages[1]).toEqual({ role: 'user', content: 'исходник' });
      expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    },
  );

  it('склеивает дельты, разрезанные между чанками', async () => {
    const payload = Buffer.from(
      'data: {"choices":[{"delta":{"content":"Привет"}}]}\n\n',
      'utf8',
    );
    const splitAt = payload.indexOf(Buffer.from('Привет')) + 1;
    mockStream([
      payload.subarray(0, splitAt),
      payload.subarray(splitAt),
      encode('data: {"choices":[{"delta":{"content":"!"}}]}\n\n'),
    ]);

    const parts: string[] = [];
    for await (const delta of service.stream({
      action: AiAction.WRITE,
      text: 'привет',
    })) {
      parts.push(delta);
    }

    expect(parts).toEqual(['Привет', '!']);
  });

  it('отвечает 503, если ключ провайдера не задан', async () => {
    apiKey = '';

    await expect(
      service.complete({ action: AiAction.WRITE, text: 'текст' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('отвечает 502, если провайдер вернул ошибку', async () => {
    mockStream([], 500);

    await expect(
      service.complete({ action: AiAction.SUMMARIZE, text: 'текст' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('отвечает 502, если поток провайдера содержит ошибку', async () => {
    mockStream([encode('data: {"error":{"message":"rate limit"}}\n\n')]);

    await expect(
      service.complete({ action: AiAction.TRANSLATE, text: 'текст' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('отвечает 502 и не бросает сырую ошибку сети', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const error: unknown = await service
      .complete({ action: AiAction.IMPROVE, text: 'текст' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpException);
    expect(error).toBeInstanceOf(BadGatewayException);
  });

  it('отвечает 504 по таймауту провайдера', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_input: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error('missing signal'));
            return;
          }
          const abort = (): void => {
            const reason: unknown = signal.reason;
            reject(reason instanceof Error ? reason : new Error('aborted'));
          };
          if (signal.aborted) {
            abort();
            return;
          }
          signal.addEventListener('abort', abort, { once: true });
        }),
    );

    const pending = service.complete({
      action: AiAction.WRITE,
      text: 'текст',
    });
    const assertion = expect(pending).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
    await jest.advanceTimersByTimeAsync(AI_IDLE_TIMEOUT_MS);
    await assertion;
  });

  it('отвечает 502, если провайдер вернул пустой ответ', async () => {
    mockStream([encode('data: [DONE]\n\n')]);

    await expect(
      service.complete({ action: AiAction.WRITE, text: 'текст' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('блокирует повторную генерацию того же пользователя (409)', () => {
    service.beginGeneration('user-1');

    expect(() => service.beginGeneration('user-1')).toThrow(ConflictException);
    expect(() => service.beginGeneration('user-2')).not.toThrow();

    service.endGeneration('user-1');
    expect(() => service.beginGeneration('user-1')).not.toThrow();
  });
});
