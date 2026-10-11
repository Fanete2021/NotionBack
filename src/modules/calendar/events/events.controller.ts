import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceEventGuard } from './guards';
import { EventsService } from './events.service';
import { UpdateEventDto } from './dto';
import { EventEntity } from './entities';
import type { AuthenticatedRequest } from './types';
import {
  EventsControllerResponse,
  EventsUpdateResponse,
  EventsDeleteResponse,
} from './decorators';

@EventsControllerResponse()
@UseGuards(WorkspaceEventGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @EventsUpdateResponse()
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<EventEntity> {
    return this.eventsService.update(id, dto, req.event);
  }

  @EventsDeleteResponse()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.eventsService.delete(id);
  }
}
