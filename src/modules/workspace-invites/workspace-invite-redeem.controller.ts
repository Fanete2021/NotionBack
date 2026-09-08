import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators';
import { WorkspaceMemberEntity } from '@modules/workspace-members/entities';
import { RedeemWorkspaceInviteDto } from '@modules/workspace-invites/dto';
import { WorkspaceInviteRedeemService } from '@modules/workspace-invites/workspace-invite-redeem.service';

@ApiBearerAuth()
@ApiTags('Workspace Invites')
@Controller('invites')
export class WorkspaceInviteRedeemController {
  constructor(
    private readonly inviteRedeemService: WorkspaceInviteRedeemService,
  ) {}

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
    return this.inviteRedeemService.redeem(userId, dto.token);
  }
}
