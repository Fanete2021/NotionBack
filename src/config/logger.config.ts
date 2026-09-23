import type { IncomingMessage, ServerResponse } from 'http';
import { ConfigService } from '@nestjs/config';
import type { Params } from 'nestjs-pino';

function createLoggerOptions(configService: ConfigService): Params {
  const isProduction =
    configService.get<string>('NODE_ENV', 'development') === 'production';
  const level = configService.get<string>(
    'LOG_LEVEL',
    isProduction ? 'info' : 'debug',
  );

  return {
    pinoHttp: {
      level,
      customLogLevel: (
        _req: IncomingMessage,
        res: ServerResponse,
        err?: Error,
      ): 'error' | 'warn' | 'info' => {
        if (err || res.statusCode >= 500) {
          return 'error';
        }
        if (res.statusCode >= 400) {
          return 'warn';
        }
        return 'info';
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        remove: true,
      },
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
    },
  };
}

export default createLoggerOptions;
