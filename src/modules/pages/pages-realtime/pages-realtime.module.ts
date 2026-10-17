import { PageCommentsModule } from '@modules/page-comments/page-comments.module';
import { UsersModule } from '@modules/users/users.module';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { Module } from '@nestjs/common';
import { PagesContentModule } from '../pages-content';
import { PagesGateway } from '../pages.gateway';
import { PagesYjsService } from '../pages-yjs.service';
import { PagesModule } from '../pages.module';

@Module({
  imports: [
    PagesModule,
    PagesContentModule,
    WorkspacesModule,
    UsersModule,
    PageCommentsModule,
  ],
  providers: [PagesYjsService, PagesGateway],
})
export class PagesRealtimeModule {}
