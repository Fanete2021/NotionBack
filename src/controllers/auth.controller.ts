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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { LogoutDto } from '../dto/logout.dto';
import {
  AuthResponseDto,
  UserDto,
  MessageResponseDto,
} from '../dto/auth-response.dto';
import type { Request, Response } from 'express';
import { UserPayload, LogoutData } from 'src/types/auth/auth.types';
import { RefreshData } from 'src/types/token/token.types';
import {
  COOKIE_NAMES,
  getCookieValue,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../utils/cookies';
import { Public } from '../decorators/public.decorator';
import { ApiValidationErrorResponse } from '../decorators/api-bad-request.decorator';

@ApiTags('Авторизация')
@ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'Регистрация нового пользователя',
    description: 'Устанавливает `refreshToken` через HttpOnly cookie.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description:
      'Пользователь успешно создан. `refreshToken` установлен в cookie.',
    type: AuthResponseDto,
  })
  @ApiValidationErrorResponse()
  @ApiResponse({ status: 409, description: 'Email уже занят' })
  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    const { refreshToken, ...responseBody } = result;
    this.handleSetCookie(res, refreshToken);
    return responseBody;
  }

  @ApiOperation({
    summary: 'Вход по email и паролю',
    description: 'Устанавливает `refreshToken` через HttpOnly cookie.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Успешный вход. `refreshToken` установлен в cookie.',
    type: AuthResponseDto,
  })
  @ApiValidationErrorResponse()
  @ApiResponse({
    status: 401,
    description: 'Неверный email или пароль (ошибка аутентификации)',
  })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    const { refreshToken, ...responseBody } = result;
    this.handleSetCookie(res, refreshToken);
    return responseBody;
  }

  @ApiOperation({
    summary: 'Обновление токенов',
    description:
      'Ожидает `refreshToken` в HttpOnly cookie. Запросы нужно слать с флагом `withCredentials: true`.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({
    status: 200,
    description: 'Токены успешно обновлены',
    type: AuthResponseDto,
  })
  @ApiValidationErrorResponse()
  @ApiResponse({
    status: 401,
    description: 'Токен недействителен или отсутствует',
  })
  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
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

  @ApiOperation({
    summary: 'Выход из системы',
    description:
      'Удаляет сессию пользователя. Запросы нужно слать с флагом `withCredentials: true` для удаления cookie. Требуется Access Token.',
  })
  @ApiBody({ type: LogoutDto })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Успешный выход',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка валидации данных или отсутствует refreshToken',
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @UseGuards(AuthGuard('jwt-access'))
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: LogoutDto,
  ) {
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
    clearRefreshTokenCookie(res, secure);
    return this.authService.logout(logoutData);
  }

  @ApiOperation({ summary: 'Получение профиля текущего пользователя' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Данные пользователя получены',
    type: UserDto,
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @UseGuards(AuthGuard('jwt-access'))
  @Get('me')
  getProfile(@Req() req: Request) {
    return req.user as UserPayload;
  }

  private handleSetCookie(res: Response, token: string): void {
    const maxAgeSeconds = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN',
      2592000,
    );
    const secure = this.configService.get<boolean>('COOKIE_SECURE', false);
    setRefreshTokenCookie(res, token, maxAgeSeconds, secure);
  }
}
