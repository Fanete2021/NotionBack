import { UsersModule } from '@modules/users/users.module';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { Module } from '@nestjs/common';
import { PagesContentModule } from '../pages-content';
import { PagesGateway } from '../pages.gateway';
import { PagesModule } from '../pages.module';

@Module({
  imports: [PagesModule, PagesContentModule, WorkspacesModule, UsersModule],
  providers: [PagesGateway],
})
export class PagesRealtimeModule {}
