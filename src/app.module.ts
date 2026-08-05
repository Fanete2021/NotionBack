import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth.module';
import { UsersModule } from './modules/users.module';
import { ProjectsModule } from './modules/projects.module';
import { WorkspacesModule } from './modules/workspaces.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Redis } from 'ioredis';
import * as Joi from 'joi';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(8000),
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.number().default(2592000),
        BCRYPT_SALT_ROUNDS: Joi.number().default(10),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        FRONT_URL: Joi.string().default('http://localhost:3000'),
        MAX_WORKSPACES_PER_USER: Joi.number().default(3),
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    WorkspacesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
        });
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class AppModule {}
