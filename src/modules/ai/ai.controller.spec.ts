import {
  BadGatewayException,
  ConflictException,
  GatewayTimeoutException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { AiAction } from './ai-action';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiCompleteEntity } from './entities';

describe('AiController', () => {
  let controller: AiController;

  const mockAiService = {
    complete: jest.fn(),
    stream: jest.fn(),
    beginGeneration: jest.fn(),
    endGeneration: jest.fn(),
  };

  const userId = 'user-1';
  const dto = { action: AiAction.WRITE, text: 'черновик' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: mockAiService }],
    }).compile();

    controller = module.get(AiController);
  });

  function mockResponse(): {
    res: Response;
    chunks: string[];
    json: jest.Mock;
    write: jest.Mock;
    end: jest.Mock;
  } {
    const chunks: string[] = [];
    const json = jest.fn().mockReturnThis();
    const write = jest.fn((chunk: string): boolean => {
      chunks.push(chunk);
      return true;
    });
    const end = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json,
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write,
      end,
      on: jest.fn(),
      off: jest.fn(),
      writableEnded: false,
      writable: true,
    } as unknown as Response;

    return { res, chunks, json, write, end };
  }

  it('возвращает json-результат действия', async () => {
    const entity = new AiCompleteEntity(AiAction.WRITE, 'готовый текст');
    mockAiService.complete.mockResolvedValue(entity);
    const response = mockResponse();

    await controller.complete(dto, userId, undefined, response.res);

    expect(mockAiService.complete).toHaveBeenCalledWith(
      dto,
      expect.any(AbortSignal),
    );
    expect(response.json).toHaveBeenCalledWith(entity);
    expect(response.write).not.toHaveBeenCalled();
    expect(mockAiService.beginGeneration).toHaveBeenCalledWith(userId);
    expect(mockAiService.endGeneration).toHaveBeenCalledWith(userId);
  });

  it('пробрасывает ошибку провайдера в json-режиме', async () => {
    mockAiService.complete.mockRejectedValue(
      new BadGatewayException('AI provider request failed'),
    );
    const response = mockResponse();

    await expect(
      controller.complete(dto, userId, undefined, response.res),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(response.json).not.toHaveBeenCalled();
    // Слот освобождается даже при ошибке провайдера.
    expect(mockAiService.endGeneration).toHaveBeenCalledWith(userId);
  });

  it('не начинает генерацию, если у пользователя уже идёт другая (409)', async () => {
    mockAiService.beginGeneration.mockImplementationOnce(() => {
      throw new ConflictException('AI generation already in progress');
    });
    const response = mockResponse();

    await expect(
      controller.complete(dto, userId, undefined, response.res),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockAiService.complete).not.toHaveBeenCalled();
    expect(mockAiService.stream).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
    expect(response.write).not.toHaveBeenCalled();
    expect(mockAiService.endGeneration).not.toHaveBeenCalled();
  });

  it('в sse сначала сообщает, что генерация ждёт модель, затем отдаёт результат', async () => {
    mockAiService.stream.mockImplementation(function* (): Generator<string> {
      yield 'Hel';
      yield 'lo';
    });
    const response = mockResponse();

    await controller.complete(dto, userId, 'text/event-stream', response.res);

    expect(response.chunks.join('')).toBe(
      [
        'event: status',
        'data: {"status":"waiting"}',
        '',
        'event: delta',
        'data: {"text":"Hel"}',
        '',
        'event: delta',
        'data: {"text":"lo"}',
        '',
        'event: done',
        'data: {"action":"write","status":"done","text":"Hello"}',
        '',
        '',
      ].join('\n'),
    );
    expect(response.end).toHaveBeenCalled();
  });

  it('в sse превращает сбой провайдера в событие error и не роняет обработчик', async () => {
    mockAiService.stream.mockImplementation(() => {
      throw new GatewayTimeoutException('AI provider request timed out');
    });
    const response = mockResponse();

    await expect(
      controller.complete(dto, userId, 'text/event-stream', response.res),
    ).resolves.toBeUndefined();

    expect(response.chunks.join('')).toContain('event: status');
    expect(response.chunks.join('')).toContain('{"status":"waiting"}');
    expect(response.chunks.join('')).toContain('event: error');
    expect(response.chunks.join('')).toContain(
      '{"status":"error","message":"AI provider request timed out"}',
    );
    expect(response.end).toHaveBeenCalled();
  });
});
