import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';
import {
  HealthControllerResponse,
  HealthResponse,
} from './decorators';

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
