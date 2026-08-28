import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export function ApiNotFoundResponse(description = 'Ресурс не найден') {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description,
    }),
  );
}
