import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import {
  HealthControllerResponse,
  HealthResponse,
} from './decorators/health-swagger.decorator';

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
