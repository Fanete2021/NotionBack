import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceMemberGuard } from '@modules/workspace-members/guards';
import { EventsService } from './events.service';
import { CreateEventDto, ListEventsQueryDto } from './dto';
import { EventEntity } from './entities';
import {
  WorkspaceEventsControllerResponse,
  WorkspaceEventsCreateResponse,
  WorkspaceEventsListResponse,
} from './decorators';

@WorkspaceEventsControllerResponse()
@UseGuards(WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId/events')
export class WorkspaceEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @WorkspaceEventsListResponse()
  @Get()
  list(
    @Param('workspaceId') workspaceId: string,
    @Query() query: ListEventsQueryDto,
  ): Promise<EventEntity[]> {
    return this.eventsService.findAllByWorkspaceId(workspaceId, query);
  }

  @WorkspaceEventsCreateResponse()
  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateEventDto,
  ): Promise<EventEntity> {
    return this.eventsService.create(workspaceId, dto);
  }
}
