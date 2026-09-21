import { getLoggerToken, PinoLogger } from 'nestjs-pino';
import type { Provider } from '@nestjs/common';

type LoggerMethod =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal'
  | 'setContext'
  | 'assign';

type MockPinoLogger = Record<LoggerMethod, jest.Mock>;

function createMockPinoLogger(): MockPinoLogger {
  return {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    setContext: jest.fn(),
    assign: jest.fn(),
  };
}

function asPinoLogger(mock: MockPinoLogger): PinoLogger {
  return mock as unknown as PinoLogger;
}

function provideMockPinoLogger(context: string): Provider {
  return {
    provide: getLoggerToken(context),
    useValue: createMockPinoLogger(),
  };
}

export type { MockPinoLogger };
export { createMockPinoLogger, asPinoLogger, provideMockPinoLogger };
