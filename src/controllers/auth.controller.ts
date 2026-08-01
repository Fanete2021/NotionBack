import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
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
import type { Request } from 'express';
import { UserPayload } from 'src/types/auth/payload.types';
import { LogoutData, RefreshData } from 'src/types/auth/auth.types';
import { LogoutDto } from 'src/dto/logout.dto';

@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно создан, возвращены токены',
  })
  @ApiResponse({ status: 409, description: 'Email уже занят' })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Вход по email и паролю' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Успешный вход, возвращены токены' })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Обновление токенов' })
  @ApiBody({ type: RefreshDto })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    const user = req.user as UserPayload;
    const refreshData: RefreshData = {
      userId: user.id,
      oldRefreshToken: dto.refreshToken,
    };
    return this.authService.refresh(refreshData);
  }

  @ApiOperation({ summary: 'Выход из системы' })
  @ApiBody({ type: LogoutDto })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request, @Body() body: { refreshToken?: string }) {
    const user = req.user as UserPayload;
    const logoutData: LogoutData = {
      userId: user.id,
      refreshToken: body.refreshToken,
    };
    return this.authService.logout(logoutData);
  }

  @ApiOperation({ summary: 'Получение профиля текущего пользователя' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Req() req: Request) {
    return req.user as UserPayload;
  }
}
