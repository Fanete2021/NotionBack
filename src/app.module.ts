import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { JwtAuthGuard } from '@common/guards';
import { RedisClient } from '@common/providers';
import { HttpExceptionsFilter, PrismaExceptionFilter } from './filters';
import {
  appConfig,
  authConfig,
  createLoggerOptions,
  databaseConfig,
} from './config';
import { validationSchema } from './validation';
import { HealthController } from './health/health.controller';
import { AttachmentsModule } from '@modules/attachments/attachments.module';
import { AuthModule } from '@modules/auth/auth.module';
import { PageCommentsModule } from '@modules/page-comments/page-comments.module';
import {
  PagesContentModule,
  PagesModule,
  PagesVersionModule,
} from '@modules/pages';
import { ProjectsModule } from '@modules/projects/projects.module';
import { UsersModule } from '@modules/users/users.module';
import { WorkspaceInvitesModule } from '@modules/workspace-invites/workspace-invites.module';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { PrismaModule } from './prisma';

@Global()
@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig],
      validationSchema,
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
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
    AttachmentsModule,
    PagesModule,
    PagesContentModule,
    PagesVersionModule,
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
