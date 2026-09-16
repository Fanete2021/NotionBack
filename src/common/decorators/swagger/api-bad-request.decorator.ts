import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '@common/dto';

export function ApiValidationErrorResponse(
  description = 'Ошибка валидации данных',
) {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      description,
      type: ErrorResponseDto,
    }),
  );
}
