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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceMemberEntity } from './entities/workspace-member.entity';
import { ApiUnauthorized } from '../../common/decorators/api-responses.decorator';

@ApiBearerAuth()
@ApiTags('Workspace Members')
@Controller('workspaces/:workspaceId/members')
export class WorkspaceMembersController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'List members of a workspace' })
  @ApiParam({
    name: 'workspaceId',
    type: String,
    description: 'Workspace id',
  })
  @ApiResponse({ status: 200, type: [WorkspaceMemberEntity] })
  @ApiUnauthorized()
  @ApiResponse({
    status: 403,
    description: 'You are not a member of this workspace',
  })
  async listMembers(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceMemberEntity[]> {
    return this.workspacesService.listMembers(userId, workspaceId);
  }

  @Post()
  @ApiOperation({
    summary:
      'Add a member to a workspace (owner or admin; admin only by owner)',
  })
  @ApiParam({
    name: 'workspaceId',
    type: String,
    description: 'Workspace id',
  })
  @ApiResponse({
    status: 201,
    description: 'Member added',
    type: WorkspaceMemberEntity,
  })
  @ApiUnauthorized()
  @ApiResponse({ status: 403, description: 'Not allowed to manage members' })
  @ApiResponse({ status: 404, description: 'Workspace or user not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  async addMember(
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

  @Patch(':userId')
  @ApiOperation({
    summary: 'Change a member role (owner can assign admins)',
  })
  @ApiParam({
    name: 'workspaceId',
    type: String,
    description: 'Workspace id',
  })
  @ApiParam({ name: 'userId', type: String, description: 'User id to update' })
  @ApiResponse({
    status: 200,
    description: 'Member role updated',
    type: WorkspaceMemberEntity,
  })
  @ApiUnauthorized()
  @ApiResponse({ status: 403, description: 'Not allowed to change this role' })
  @ApiResponse({
    status: 404,
    description: 'Workspace or membership not found',
  })
  async changeMemberRole(
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

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a member from a workspace (owner or admin)',
  })
  @ApiParam({
    name: 'workspaceId',
    type: String,
    description: 'Workspace id',
  })
  @ApiParam({ name: 'userId', type: String, description: 'User id to remove' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  @ApiUnauthorized()
  @ApiResponse({ status: 403, description: 'Not allowed to manage members' })
  @ApiResponse({
    status: 404,
    description: 'Workspace or membership not found',
  })
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') memberId: string,
  ): Promise<void> {
    await this.workspacesService.removeMember(userId, workspaceId, memberId);
  }
}
