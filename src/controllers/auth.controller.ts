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
import { getCookieValue } from '../utils/cookies';
import { Public } from '../decorators/public.decorator';

@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getRefreshTokenFromRequest(req: Request): string | undefined {
    return getCookieValue(req, 'refreshToken');
  }

  private setRefreshTokenCookie(res: Response, token: string): void {
    const maxAgeSeconds = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN',
      2592000,
    );

    res.cookie('refreshToken', token, {
      httpOnly: true,
      sameSite: 'none',
      maxAge: maxAgeSeconds * 1000, // Переводим секунды в миллисекунды для cookie
      path: '/',
      secure: false,
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'none',
      path: '/',
      secure: false,
    });
  }

  @ApiOperation({
    summary: 'Регистрация нового пользователя',
    description: 'Устанавливает `refresh_token` через HttpOnly cookie.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description:
      'Пользователь успешно создан. `refresh_token` установлен в cookie.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации данных' })
  @ApiResponse({ status: 409, description: 'Email уже занят' })
  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    const { refreshToken, ...responseBody } = result;
    this.setRefreshTokenCookie(res, refreshToken);
    return responseBody;
  }

  @ApiOperation({
    summary: 'Вход по email и паролю',
    description: 'Устанавливает `refresh_token` через HttpOnly cookie.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Успешный вход. `refresh_token` установлен в cookie.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации данных' })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    const { refreshToken, ...responseBody } = result;
    this.setRefreshTokenCookie(res, refreshToken);
    return responseBody;
  }

  @ApiOperation({
    summary: 'Обновление токенов',
    description:
      'Ожидает `refresh_token` в HttpOnly cookie. Запросы нужно слать с флагом `withCredentials: true`.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({
    status: 200,
    description: 'Токены успешно обновлены',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Ошибка валидации данных' })
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
    const oldRefreshToken = this.getRefreshTokenFromRequest(req);
    if (!oldRefreshToken) {
      throw new UnauthorizedException('Refresh token not found in cookies');
    }

    const refreshData: RefreshData = { token: oldRefreshToken };
    const result = await this.authService.refresh(refreshData);
    const { refreshToken, ...responseBody } = result;
    this.setRefreshTokenCookie(res, refreshToken);
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
    const refreshToken = this.getRefreshTokenFromRequest(req);

    if (!body.allDevices && !refreshToken) {
      throw new UnauthorizedException(
        'Refresh token is required to logout from a single device',
      );
    }

    // Если allDevices = true, мы передаем token = undefined в сервис,
    // чтобы он удалил все сессии по маске (userId:*).
    // Если false/undefined, передаем конкретный токен, чтобы удалить только его.
    const logoutData: LogoutData = {
      userId: user.id,
      token: body.allDevices ? undefined : refreshToken,
    };

    this.clearRefreshTokenCookie(res);
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
}
