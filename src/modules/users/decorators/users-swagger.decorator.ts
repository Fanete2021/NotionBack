import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserEntity } from '../user.entity';
import { UpdateProfileDto } from '../dto';
import { ErrorResponseDto } from '@common/dto';
import {
  ApiValidationErrorResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@common/decorators/swagger';

function UsersControllerResponse() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiTags('Пользователи'),
    ApiUnauthorizedResponse(),
    ApiInternalServerErrorResponse(),
  );
}

function UsersUpdateProfileResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Обновить профиль текущего пользователя' }),
    ApiBody({ type: UpdateProfileDto }),
    ApiResponse({
      status: 200,
      description: 'Профиль успешно обновлён',
      type: UserEntity,
    }),
    ApiValidationErrorResponse(),
    ApiResponse({
      status: 409,
      description: 'Email уже занят',
      type: ErrorResponseDto,
    }),
  );
}

export { UsersControllerResponse, UsersUpdateProfileResponse };
