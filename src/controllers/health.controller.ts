import { Controller, Get } from '@nestjs/common';
import { Public } from '../decorators/swagger/common/public.decorator';
import {
  HealthControllerResponse,
  HealthResponse,
} from '../decorators/swagger/controller/health-swagger.decorator';

@HealthControllerResponse()
@Controller('health')
export class HealthController {
  @HealthResponse()
  @Public()
  @Get()
  check(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
