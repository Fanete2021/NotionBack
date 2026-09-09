import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators';
import { CreateWorkspaceInviteDto } from '@modules/workspace-invites/dto';
import { WorkspaceInviteEntity } from '@modules/workspace-invites/entities';
import { WorkspaceInviteSummaryEntity } from '@modules/workspace-invites/entities';
import {
  WorkspaceInvitesControllerResponse,
  WorkspaceInvitesCreateResponse,
  WorkspaceInvitesListResponse,
  WorkspaceInvitesRevokeResponse,
} from '@modules/workspace-invites/decorators';
import { WorkspaceInvitesService } from '@modules/workspace-invites/workspace-invites.service';

@WorkspaceInvitesControllerResponse()
@Controller('workspaces/:workspaceId/invites')
export class WorkspaceInvitesController {
  constructor(private readonly invitesService: WorkspaceInvitesService) {}

  @WorkspaceInvitesCreateResponse()
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWorkspaceInviteDto,
  ): Promise<WorkspaceInviteEntity> {
    return this.invitesService.create(userId, workspaceId, dto.type, dto.role);
  }

  @WorkspaceInvitesListResponse()
  @Get()
  async list(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceInviteSummaryEntity[]> {
    return this.invitesService.list(userId, workspaceId);
  }

  @WorkspaceInvitesRevokeResponse()
  @Delete(':inviteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('inviteId') inviteId: string,
  ): Promise<void> {
    await this.invitesService.revoke(userId, workspaceId, inviteId);
  }
}
