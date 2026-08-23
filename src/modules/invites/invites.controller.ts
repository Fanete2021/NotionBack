import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceMemberEntity } from '../workspaces/entities/workspace-member.entity';
import { CreateWorkspaceInviteDto } from './dto/create-workspace-invite.dto';
import { RedeemInviteDto } from './dto/redeem-invite.dto';
import { WorkspaceInviteEntity } from './entities/workspace-invite.entity';
import { InvitesService } from './invites.service';

@ApiBearerAuth()
@Controller()
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post('workspaces/:id/invites')
  @ApiTags('Workspace Invites')
  @ApiOperation({
    summary: 'Create an invite link for a workspace (owner or admin)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Workspace id' })
  @ApiResponse({
    status: 201,
    description: 'Invite link created',
    type: WorkspaceInviteEntity,
  })
  @ApiResponse({
    status: 403,
    description:
      'Not allowed to manage members or role cannot be granted via invite',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async create(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
    @Body() dto: CreateWorkspaceInviteDto,
  ): Promise<WorkspaceInviteEntity> {
    return this.invitesService.create(userId, workspaceId, dto.type, dto.role);
  }

  @Post('invites/redeem')
  @ApiTags('Workspace Invites')
  @ApiOperation({ summary: 'Join a workspace by an invite token' })
  @ApiResponse({
    status: 201,
    description: 'Joined the workspace',
    type: WorkspaceMemberEntity,
  })
  @ApiResponse({ status: 404, description: 'Invite is invalid or expired' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  async redeem(
    @CurrentUser('id') userId: string,
    @Body() dto: RedeemInviteDto,
  ): Promise<WorkspaceMemberEntity> {
    return this.invitesService.redeem(userId, dto.token);
  }
}
