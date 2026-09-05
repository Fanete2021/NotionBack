import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiInternalServerErrorResponse } from '../../common/decorators/swagger/api-internal-server-error.decorator';

export function HealthControllerResponse() {
  return applyDecorators(ApiTags('Health'), ApiInternalServerErrorResponse());
}

export function HealthResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Проверка работоспособности приложения' }),
    ApiResponse({ status: 200, description: 'Приложение работает' }),
  );
}
