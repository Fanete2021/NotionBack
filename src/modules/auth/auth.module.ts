import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from '@modules/auth/auth.controller';
import { AuthService } from '@modules/auth/auth.service';
import { TokenService } from '@modules/auth/token.service';
import { UsersModule } from '@modules/users/users.module';
import { AccessStrategy } from '@modules/auth/strategies';
import { RefreshStrategy } from '@modules/auth/strategies';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET')!,
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, AccessStrategy, RefreshStrategy],
})
export class AuthModule {}
