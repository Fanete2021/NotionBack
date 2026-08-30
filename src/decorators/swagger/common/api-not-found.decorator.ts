import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../dto/error-response.dto';

export function ApiNotFoundResponse(description = 'Ресурс не найден') {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description,
      type: ErrorResponseDto,
    }),
  );
}
