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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateWorkspaceInviteDto } from './dto/create-workspace-invite.dto';
import { WorkspaceInviteEntity } from './entities/workspace-invite.entity';
import { WorkspaceInviteSummaryEntity } from './entities/workspace-invite-summary.entity';
import { WorkspaceInvitesService } from './workspace-invites.service';

@ApiBearerAuth()
@ApiTags('Workspace Invites')
@Controller('workspaces/:workspaceId/invites')
export class WorkspaceInvitesController {
  constructor(private readonly invitesService: WorkspaceInvitesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an invite link for a workspace (owner or admin)',
  })
  @ApiParam({ name: 'workspaceId', type: String, description: 'Workspace id' })
  @ApiResponse({
    status: 201,
    description: 'Invite link created',
    type: WorkspaceInviteEntity,
  })
  @ApiResponse({
    status: 403,
    description:
      'Not allowed to manage members, role cannot be granted via invite, or the permanent invite limit is reached',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async create(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWorkspaceInviteDto,
  ): Promise<WorkspaceInviteEntity> {
    return this.invitesService.create(userId, workspaceId, dto.type, dto.role);
  }

  @Get()
  @ApiOperation({
    summary:
      'List permanent invite links of a workspace (owner or admin). Temporary links are not listed: they live in Redis and expire on their own',
  })
  @ApiParam({ name: 'workspaceId', type: String, description: 'Workspace id' })
  @ApiResponse({ status: 200, type: [WorkspaceInviteSummaryEntity] })
  @ApiResponse({ status: 403, description: 'Not allowed to manage members' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async list(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceInviteSummaryEntity[]> {
    return this.invitesService.list(userId, workspaceId);
  }

  @Delete(':inviteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke a permanent invite link (owner or admin)',
  })
  @ApiParam({ name: 'workspaceId', type: String, description: 'Workspace id' })
  @ApiParam({ name: 'inviteId', type: String, description: 'Invite id' })
  @ApiResponse({ status: 204, description: 'Invite revoked' })
  @ApiResponse({ status: 403, description: 'Not allowed to manage members' })
  @ApiResponse({
    status: 404,
    description: 'Workspace or invite not found',
  })
  async revoke(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('inviteId') inviteId: string,
  ): Promise<void> {
    await this.invitesService.revoke(userId, workspaceId, inviteId);
  }
}
