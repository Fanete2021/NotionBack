import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthResponseDto,
  AuthUserDto,
  MessageResponseDto,
} from '../../../dto/auth-response.dto';
import { ErrorResponseDto } from '../../../dto/error-response.dto';
import { RegisterDto } from '../../../dto/register.dto';
import { ApiValidationErrorResponse } from '../common/api-bad-request.decorator';
import { LoginDto } from '../../../dto/login.dto';
import { LogoutDto } from '../../../dto/logout.dto';
import { ApiInternalServerErrorResponse } from '../common/api-internal-server-error.decorator';

export function AuthControllerResponse() {
  return applyDecorators(
    ApiTags('Авторизация'),
    ApiInternalServerErrorResponse(),
  );
}

export function RegisterResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Регистрация нового пользователя',
      description: 'Устанавливает `refreshToken` через HttpOnly cookie.',
    }),
    ApiBody({ type: RegisterDto }),
    ApiResponse({
      status: 201,
      description:
        'Пользователь успешно создан. `refreshToken` установлен в cookie.',
      type: AuthResponseDto,
    }),
    ApiValidationErrorResponse(),
    ApiResponse({
      status: 409,
      description: 'Email уже занят',
      type: ErrorResponseDto,
    }),
  );
}

export function LoginResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Вход по email и паролю',
      description: 'Устанавливает `refreshToken` через HttpOnly cookie.',
    }),
    ApiBody({ type: LoginDto }),
    ApiResponse({
      status: 200,
      description: 'Успешный вход. `refreshToken` установлен в cookie.',
      type: AuthResponseDto,
    }),
    ApiValidationErrorResponse(),
    ApiResponse({
      status: 401,
      description: 'Неверный email или пароль (ошибка аутентификации)',
      type: ErrorResponseDto,
    }),
  );
}

export function RefreshResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Обновление токенов',
      description:
        'Ожидает `refreshToken` в HttpOnly cookie. Запросы нужно слать с флагом `withCredentials: true`.',
    }),
    ApiCookieAuth('refreshToken'),
    ApiResponse({
      status: 200,
      description: 'Токены успешно обновлены',
      type: AuthResponseDto,
    }),
    ApiValidationErrorResponse(),
    ApiResponse({
      status: 401,
      description: 'Токен недействителен или отсутствует',
      type: ErrorResponseDto,
    }),
  );
}

export function LogoutResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Выход из системы',
      description:
        'Удаляет сессию пользователя. Запросы нужно слать с флагом `withCredentials: true` для удаления cookie. Требуется Access Token.',
    }),
    ApiBody({ type: LogoutDto }),
    ApiBearerAuth(),
    ApiResponse({
      status: 200,
      description: 'Успешный выход',
      type: MessageResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Ошибка валидации данных или отсутствует refreshToken',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Не авторизован',
      type: ErrorResponseDto,
    }),
  );
}

export function MeResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Получение профиля текущего пользователя' }),
    ApiBearerAuth(),
    ApiResponse({
      status: 200,
      description: 'Данные пользователя получены',
      type: AuthUserDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Не авторизован',
      type: ErrorResponseDto,
    }),
  );
}
