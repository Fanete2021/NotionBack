import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RedisClient } from './common/providers/redis-client';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import { HealthController } from './health/health.controller';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AuthModule } from './modules/auth/auth.module';
import { PagesModule } from './modules/pages/pages.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspaceInvitesModule } from './modules/workspace-invites/workspace-invites.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { PrismaModule } from './prisma/prisma.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(8000),
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.number().default(900),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.number().default(2592000),
        BCRYPT_SALT_ROUNDS: Joi.number().default(10),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        S3_ENDPOINT: Joi.string().default('http://localhost:9000'),
        S3_REGION: Joi.string().default('us-east-1'),
        S3_BUCKET: Joi.string().default('notion-attachments'),
        S3_ACCESS_KEY_ID: Joi.string().default('minioadmin'),
        S3_SECRET_ACCESS_KEY: Joi.string().default('minioadmin'),
        S3_PUBLIC_URL: Joi.string().default(
          'http://localhost:9000/notion-attachments',
        ),
        ATTACHMENT_IMAGE_MAX_BYTES: Joi.number()
          .integer()
          .positive()
          .default(10485760),
        ATTACHMENT_VIDEO_MAX_BYTES: Joi.number()
          .integer()
          .positive()
          .default(26214400),
        ATTACHMENT_PRESIGN_EXPIRES_SECONDS: Joi.number()
          .integer()
          .positive()
          .default(300),
        CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
        MAX_WORKSPACES_PER_USER: Joi.number().default(3),
        MAX_PAGE_CONTENT_BYTES: Joi.number().default(1048576),
        INVITE_TTL_SECONDS: Joi.number().integer().positive().default(86400),
        MAX_INVITES_PER_WORKSPACE: Joi.number()
          .integer()
          .positive()
          .default(10),
        FRONT_URL: Joi.string().uri().default('http://localhost:3000'),
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
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    RedisClient,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [RedisClient],
})
export class AppModule { }
