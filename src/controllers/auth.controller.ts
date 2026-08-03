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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import type { Request, Response } from 'express';
import { UserPayload } from 'src/types/auth/payload.types';
import { LogoutData, RefreshData } from 'src/types/auth/auth.types';
import { LogoutDto } from 'src/dto/logout.dto';
import { getCookieValue } from '../utils/cookies';

@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getRefreshTokenFromRequest(req: Request): string | undefined {
    return getCookieValue(req, 'refreshToken');
  }

  private setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      path: '/',
      secure: true,
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно создан, возвращены токены',
  })
  @ApiResponse({ status: 409, description: 'Email уже занят' })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @ApiOperation({ summary: 'Вход по email и паролю' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Успешный вход, возвращены токены' })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @ApiOperation({ summary: 'Обновление токенов' })
  @ApiBody({ type: RefreshDto })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      this.getRefreshTokenFromRequest(req) ?? dto.refreshToken;
    const refreshData: RefreshData = {
      token: refreshToken,
    };
    const result = await this.authService.refresh(refreshData);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @ApiOperation({ summary: 'Выход из системы' })
  @ApiBody({ type: LogoutDto })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt-access'))
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: LogoutDto,
  ) {
    const user = req.user as UserPayload;
    const refreshToken =
      this.getRefreshTokenFromRequest(req) ?? body.refreshToken;
    const logoutData: LogoutData = {
      userId: user.id,
      token: refreshToken,
    };
    this.clearRefreshTokenCookie(res);
    return this.authService.logout(logoutData);
  }

  @ApiOperation({ summary: 'Получение профиля текущего пользователя' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt-access'))
  @Get('me')
  getProfile(@Req() req: Request) {
    return req.user as UserPayload;
  }
}
