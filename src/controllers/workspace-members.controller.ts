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

import { WorkspacesService } from '../services/workspaces.service';
import { AddWorkspaceMemberDto } from '../dto/add-workspace-member.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';
import { CurrentUser } from '../decorators/swagger/common/current-user.decorator';
import { WorkspaceMemberEntity } from '../entities/workspace-member.entity';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard';
import {
  WorkspaceMemberControllerResponse,
  WorkspaceMemberListMembersResponse,
  WorkspaceMemberAddMemberResponse,
  WorkspaceMemberChangeMemberRoleResponse,
  WorkspaceMemberRemoveMemberResponse,
} from '../decorators/swagger/controller/workspace-members-swagger.decorator';

@WorkspaceMemberControllerResponse()
@UseGuards(WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId/members')
export class WorkspaceMembersController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @WorkspaceMemberListMembersResponse()
  @Get()
  listMembers(
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceMemberEntity[]> {
    return this.workspacesService.listMembers(workspaceId);
  }

  @WorkspaceMemberAddMemberResponse()
  @Post()
  addMember(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: AddWorkspaceMemberDto,
  ): Promise<WorkspaceMemberEntity> {
    return this.workspacesService.addMember(
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
    return this.workspacesService.changeMemberRole(
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
    return this.workspacesService.removeMember(userId, workspaceId, memberId);
  }
}
