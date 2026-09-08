import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { WorkspaceMembersService } from './workspace-members.service';
import { AddWorkspaceMemberDto } from './dto';
import { UpdateMemberRoleDto } from './dto';
import { CurrentUser } from '../../common/decorators';
import { WorkspaceMemberEntity } from './entities';
import { WorkspaceMemberGuard } from './guards';
import {
  WorkspaceMemberControllerResponse,
  WorkspaceMemberListMembersResponse,
  WorkspaceMemberAddMemberResponse,
  WorkspaceMemberChangeMemberRoleResponse,
  WorkspaceMemberRemoveMemberResponse,
} from './decorators';

@WorkspaceMemberControllerResponse()
@UseGuards(WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId/members')
export class WorkspaceMembersController {
  constructor(
    private readonly workspaceMembersService: WorkspaceMembersService,
  ) {}

  @WorkspaceMemberListMembersResponse()
  @Get()
  listMembers(
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceMemberEntity[]> {
    return this.workspaceMembersService.listMembers(workspaceId);
  }

  @WorkspaceMemberAddMemberResponse()
  @Post()
  addMember(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: AddWorkspaceMemberDto,
  ): Promise<WorkspaceMemberEntity> {
    return this.workspaceMembersService.addMember(
      userId,
      workspaceId,
      dto.userId,
      dto.role,
    );
  }

  @WorkspaceMemberChangeMemberRoleResponse()
  @Patch(':userId')
  changeMemberRole(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<WorkspaceMemberEntity> {
    return this.workspaceMembersService.changeMemberRole(
      userId,
      workspaceId,
      memberId,
      dto.role,
    );
  }

  @WorkspaceMemberRemoveMemberResponse()
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') memberId: string,
  ): Promise<void> {
    return this.workspaceMembersService.removeMember(
      userId,
      workspaceId,
      memberId,
    );
  }
}
