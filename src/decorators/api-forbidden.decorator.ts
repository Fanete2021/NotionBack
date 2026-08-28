import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

export function ApiForbiddenResponse(
  description = 'Вы не являетесь участником этого воркспейса',
) {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description,
      type: ErrorResponseDto,
    }),
  );
}
