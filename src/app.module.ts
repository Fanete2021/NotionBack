import { JwtAuthGuard } from '@common/guards';
import { RedisClient } from '@common/providers';
import { AttachmentsModule } from '@modules/attachments/attachments.module';
import { AuthModule } from '@modules/auth/auth.module';
import { CalendarModule } from '@modules/calendar';
import { PageCommentsModule } from '@modules/page-comments/page-comments.module';
import {
  PagesContentModule,
  PagesModule,
  PagesRealtimeModule,
  PagesTrashModule,
  PagesVersionModule,
} from '@modules/pages';
import { ProjectsModule } from '@modules/projects/projects.module';
import { UsersModule } from '@modules/users/users.module';
import { WorkspaceInvitesModule } from '@modules/workspace-invites/workspace-invites.module';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { LoggerModule } from 'nestjs-pino';
import {
  appConfig,
  authConfig,
  createLoggerOptions,
  databaseConfig,
} from './config';
import { HttpExceptionsFilter, PrismaExceptionFilter } from './filters';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma';
import { validationSchema } from './validation';

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
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET')!,
        signOptions: {
          expiresIn: '15m',
        },
      }),
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
    PagesTrashModule,
    PagesRealtimeModule,
    PageCommentsModule,
    CalendarModule,
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
