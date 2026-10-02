import { Module } from '@nestjs/common';
import { EventsController } from './events/events.controller';
import { WorkspaceEventsController } from './events/workspace-events.controller';
import { EventsService } from './events/events.service';
import { EventsRepository } from './events/events.repository';
import { EventsMapper } from './events/events.mapper';
import { WorkspaceEventGuard } from './events/guards';
import { PrismaModule } from '../../prisma';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { ProjectsModule } from '@modules/projects/projects.module';

@Module({
  imports: [PrismaModule, WorkspacesModule, ProjectsModule],
  controllers: [EventsController, WorkspaceEventsController],
  providers: [
    EventsService,
    EventsRepository,
    EventsMapper,
    WorkspaceEventGuard,
  ],
  exports: [EventsRepository],
})
export class CalendarModule {}
