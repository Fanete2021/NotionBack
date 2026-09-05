import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../dto/error-response.dto';

export function ApiUnauthorizedResponse(description = 'Не авторизован') {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description,
      type: ErrorResponseDto,
    }),
  );
}
