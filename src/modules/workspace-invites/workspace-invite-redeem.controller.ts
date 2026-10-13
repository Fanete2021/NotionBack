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
@ApiTags('Приглашения в воркспейс')
@Controller('invites')
export class WorkspaceInviteRedeemController {
  constructor(
    private readonly inviteRedeemService: WorkspaceInviteRedeemService,
  ) {}

  @Post('redeem')
  @ApiOperation({ summary: 'Вступить в воркспейс по токену приглашения' })
  @ApiResponse({
    status: 201,
    description: 'Пользователь вступил в воркспейс',
    type: WorkspaceMemberEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Приглашение недействительно или истекло',
  })
  @ApiResponse({
    status: 409,
    description: 'Пользователь уже является участником',
  })
  async redeem(
    @CurrentUser('id') userId: string,
    @Body() dto: RedeemWorkspaceInviteDto,
  ): Promise<WorkspaceMemberEntity> {
    return this.inviteRedeemService.redeem(userId, dto.token);
  }
}
