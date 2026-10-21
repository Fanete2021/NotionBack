import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AiCompleteResponse, AiControllerResponse } from './decorators';
import { CompleteAiDto } from './dto';
import { AiCompleteEntity } from './entities';
import { AiService } from './ai.service';

@AiControllerResponse()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @AiCompleteResponse()
  @HttpCode(HttpStatus.OK)
  @Post('complete')
  async complete(
    @Body() dto: CompleteAiDto,
    @Headers('accept') accept: string | string[] | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.wantsStream(accept)) {
      const result = await this.aiService.complete(dto);
      res.status(HttpStatus.OK).json(result);
      return;
    }

    await this.writeStream(dto, res);
  }

  private wantsStream(accept?: string | string[]): boolean {
    const value = Array.isArray(accept) ? accept.join(',') : (accept ?? '');
    return value.toLowerCase().includes('text/event-stream');
  }

  private async writeStream(dto: CompleteAiDto, res: Response): Promise<void> {
    const clientAbort = new AbortController();
    const onClose = (): void => {
      clientAbort.abort();
    };

    res.status(HttpStatus.OK);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.on('close', onClose);

    try {
      this.writeEvent(res, 'status', { status: 'waiting' });
      let text = '';
      for await (const delta of this.aiService.stream(
        dto,
        clientAbort.signal,
      )) {
        text += delta;
        this.writeEvent(res, 'delta', { text: delta });
      }
      this.writeEvent(res, 'done', new AiCompleteEntity(dto.action, text));
    } catch (error: unknown) {
      if (clientAbort.signal.aborted) {
        return;
      }
      this.writeEvent(res, 'error', {
        status: 'error',
        message: this.errorMessage(error),
      });
    } finally {
      res.off('close', onClose);
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  private writeEvent(res: Response, event: string, data: object): void {
    if (res.writableEnded || !res.writable) {
      return;
    }
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpException && error.message) {
      return error.message;
    }
    return 'AI provider request failed';
  }
}
