import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto';
import { LoginDto } from './dto';
import { LogoutDto } from './dto';
import { AuthResponseDto } from './dto';
import type { Request, Response } from 'express';
import type { UserPayload } from '../../common/types';
import { LogoutData, LogoutResult } from './types';
import { RefreshData } from './types';
import { COOKIE_NAMES } from '../../common/constants';
import { SameSite } from '../../common/types';
import { getCookieValue } from '../../common/utils';
import { setRefreshTokenCookie } from '../../common/utils';
import { clearRefreshTokenCookie } from '../../common/utils';
import { Public } from '../../common/decorators';
import {
  AuthControllerResponse,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RefreshResponse,
  RegisterResponse,
} from './decorators';

@AuthControllerResponse()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @RegisterResponse()
  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto);
    const { refreshToken, ...responseBody } = result;
    this.handleSetCookie(res, refreshToken);
    return responseBody;
  }

  @LoginResponse()
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto);
    const { refreshToken, ...responseBody } = result;
    this.handleSetCookie(res, refreshToken);
    return responseBody;
  }

  @RefreshResponse()
  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const oldRefreshToken = getCookieValue(req, COOKIE_NAMES.REFRESH_TOKEN);
    if (!oldRefreshToken) {
      throw new UnauthorizedException('Refresh token not found in cookies');
    }

    const refreshData: RefreshData = { token: oldRefreshToken };
    const result = await this.authService.refresh(refreshData);
    const { refreshToken, ...responseBody } = result;
    this.handleSetCookie(res, refreshToken);
    return responseBody;
  }

  @LogoutResponse()
  @UseGuards(AuthGuard('jwt-access'))
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: LogoutDto,
  ): Promise<LogoutResult> {
    const user = req.user as UserPayload;
    const refreshToken = getCookieValue(req, COOKIE_NAMES.REFRESH_TOKEN);

    if (!body.allDevices && !refreshToken) {
      throw new UnauthorizedException(
        'Refresh token is required to logout from a single device',
      );
    }

    const logoutData: LogoutData = {
      userId: user.id,
      token: body.allDevices ? undefined : refreshToken,
    };

    const secure = this.configService.get<boolean>('COOKIE_SECURE', false);
    const sameSite = this.configService.get<SameSite>(
      'COOKIE_SAME_SITE',
      'lax',
    );
    clearRefreshTokenCookie(res, secure, sameSite);
    return this.authService.logout(logoutData);
  }

  @MeResponse()
  @UseGuards(AuthGuard('jwt-access'))
  @Get('me')
  getProfile(@Req() req: Request): UserPayload {
    return req.user as UserPayload;
  }

  private handleSetCookie(res: Response, token: string): void {
    const maxAgeSeconds = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN',
      2592000,
    );
    const secure = this.configService.get<boolean>('COOKIE_SECURE', false);
    const sameSite = this.configService.get<SameSite>(
      'COOKIE_SAME_SITE',
      'lax',
    );
    setRefreshTokenCookie(res, token, maxAgeSeconds, secure, sameSite);
  }
}
