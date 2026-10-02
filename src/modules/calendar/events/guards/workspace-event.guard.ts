import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { EventsService } from '@modules/calendar/events/events.service';
import { AuthenticatedRequest } from '@modules/calendar/events/types';

@Injectable()
export class WorkspaceEventGuard implements CanActivate {
  constructor(
    private readonly eventsService: EventsService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const eventId = Array.isArray(request.params.id)
      ? request.params.id[0]
      : request.params.id;

    const event = await this.eventsService.findById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.workspacesService.assertMemberOf(event.workspaceId, userId);

    request.event = event;

    return true;
  }
}
