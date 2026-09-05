import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceMemberEntity } from '../workspaces/entities/workspace-member.entity';
import { RedeemWorkspaceInviteDto } from './dto/redeem-workspace-invite.dto';
import { WorkspaceInvitesService } from './workspace-invites.service';

@ApiBearerAuth()
@ApiTags('Workspace Invites')
@Controller('invites')
export class WorkspaceInviteRedeemController {
  constructor(private readonly invitesService: WorkspaceInvitesService) {}

  @Post('redeem')
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
    @Body() dto: RedeemWorkspaceInviteDto,
  ): Promise<WorkspaceMemberEntity> {
    return this.invitesService.redeem(userId, dto.token);
  }
}
