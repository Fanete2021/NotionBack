import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { ProjectsModule } from '@modules/projects/projects.module';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { WorkspaceInvitesModule } from '@modules/workspace-invites/workspace-invites.module';
import { PagesModule } from '@modules/pages/pages.module';
import { PageCommentsModule } from '@modules/page-comments/page-comments.module';
import { JwtAuthGuard } from '@common/guards';
import { RedisClient } from '@common/providers';
import { HttpExceptionsFilter, PrismaExceptionFilter } from './filters';
import {
  appConfig,
  authConfig,
  createLoggerOptions,
  databaseConfig,
} from './config';
import { sentryValidationSchema } from './validation';
import * as Joi from 'joi';

@Global()
@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production')
          .default('development'),
        LOG_LEVEL: Joi.string()
          .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
          .optional(),
        PORT: Joi.number().default(8000),
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.number().default(900),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.number().default(2592000),
        BCRYPT_SALT_ROUNDS: Joi.number().default(10),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
        MAX_WORKSPACES_PER_USER: Joi.number().default(3),
        MAX_PAGE_CONTENT_BYTES: Joi.number().default(1048576),
        INVITE_TTL_SECONDS: Joi.number().integer().positive().default(86400),
        MAX_INVITES_PER_WORKSPACE: Joi.number()
          .integer()
          .positive()
          .default(10),
        FRONT_URL: Joi.string().uri().default('http://localhost:3000'),
        COOKIE_SECURE: Joi.boolean().default(false),
        COOKIE_SAME_SITE: Joi.string()
          .valid('lax', 'strict', 'none')
          .default('lax'),
        ...sentryValidationSchema,
      }),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createLoggerOptions(configService),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    WorkspacesModule,
    WorkspaceInvitesModule,
    PagesModule,
    PageCommentsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    RedisClient,
    PrismaExceptionFilter,
    HttpExceptionsFilter,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [RedisClient],
})
export class AppModule {}
