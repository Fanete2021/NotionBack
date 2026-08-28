import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

export function ApiInternalServerErrorResponse(
  description = 'Внутренняя ошибка сервера',
) {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description,
      type: ErrorResponseDto,
    }),
  );
}
