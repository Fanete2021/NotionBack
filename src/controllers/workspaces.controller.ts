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
import { WorkspacesService } from '../services/workspaces.service';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { AddWorkspaceMemberDto } from '../dto/add-workspace-member.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { WorkspaceMemberEntity } from '../entities/workspace-member.entity';

@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiTags('Workspaces')
  @ApiOperation({ summary: 'Create a workspace for the current user' })
  @ApiResponse({
    status: 201,
    description: 'Workspace created',
    type: WorkspaceEntity,
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<WorkspaceEntity> {
    return this.workspacesService.create(userId, dto.name);
  }

  @Get()
  @ApiTags('Workspaces')
  @ApiOperation({ summary: 'Get all workspaces of the current user' })
  @ApiResponse({ status: 200, type: [WorkspaceEntity] })
  async findAllByUserId(
    @CurrentUser('id') userId: string,
  ): Promise<WorkspaceEntity[]> {
    return this.workspacesService.findAllByUserId(userId);
  }

  @Get(':id')
  @ApiTags('Workspaces')
  @ApiOperation({ summary: 'Get a workspace by id' })
  @ApiParam({ name: 'id', type: String, description: 'Workspace id' })
  @ApiResponse({ status: 200, type: WorkspaceEntity })
  @ApiResponse({
    status: 403,
    description: 'You are not a member of this workspace',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async findById(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
  ): Promise<WorkspaceEntity> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return this.workspacesService.findById(workspaceId);
  }

  @Patch(':id')
  @ApiTags('Workspaces')
  @ApiOperation({ summary: 'Update a workspace (owner only)' })
  @ApiParam({ name: 'id', type: String, description: 'Workspace id' })
  @ApiResponse({ status: 200, type: WorkspaceEntity })
  @ApiResponse({
    status: 403,
    description: 'Only the workspace owner can do this',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceEntity> {
    await this.workspacesService.assertOwner(workspaceId, userId);
    return this.workspacesService.update(workspaceId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiTags('Workspaces')
  @ApiOperation({ summary: 'Delete a workspace (owner only)' })
  @ApiParam({ name: 'id', type: String, description: 'Workspace id' })
  @ApiResponse({ status: 204, description: 'Workspace deleted' })
  @ApiResponse({
    status: 403,
    description: 'Only the workspace owner can do this',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
  ): Promise<void> {
    await this.workspacesService.assertOwner(workspaceId, userId);
    await this.workspacesService.delete(workspaceId);
  }

  @Get(':id/members')
  @ApiTags('Workspace Members')
  @ApiOperation({ summary: 'List members of a workspace' })
  @ApiParam({ name: 'id', type: String, description: 'Workspace id' })
  @ApiResponse({ status: 200, type: [WorkspaceMemberEntity] })
  @ApiResponse({
    status: 403,
    description: 'You are not a member of this workspace',
  })
  async listMembers(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
  ): Promise<WorkspaceMemberEntity[]> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return this.workspacesService.listMembers(workspaceId);
  }

  @Post(':id/members')
  @ApiTags('Workspace Members')
  @ApiOperation({
    summary:
      'Add a member to a workspace (owner or admin; admin only by owner)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Workspace id' })
  @ApiResponse({
    status: 201,
    description: 'Member added',
    type: WorkspaceMemberEntity,
  })
  @ApiResponse({ status: 403, description: 'Not allowed to manage members' })
  @ApiResponse({ status: 404, description: 'Workspace or user not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  async addMember(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
    @Body() dto: AddWorkspaceMemberDto,
  ): Promise<WorkspaceMemberEntity> {
    return this.workspacesService.addMember(
      userId,
      workspaceId,
      dto.userId,
      dto.role,
    );
  }

  @Patch(':id/members/:userId')
  @ApiTags('Workspace Members')
  @ApiOperation({
    summary: 'Change a member role (owner can assign admins)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Workspace id' })
  @ApiParam({ name: 'userId', type: String, description: 'User id to update' })
  @ApiResponse({
    status: 200,
    description: 'Member role updated',
    type: WorkspaceMemberEntity,
  })
  @ApiResponse({ status: 403, description: 'Not allowed to change this role' })
  @ApiResponse({
    status: 404,
    description: 'Workspace or membership not found',
  })
  async changeMemberRole(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
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

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiTags('Workspace Members')
  @ApiOperation({
    summary: 'Remove a member from a workspace (owner or admin)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Workspace id' })
  @ApiParam({ name: 'userId', type: String, description: 'User id to remove' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  @ApiResponse({ status: 403, description: 'Not allowed to manage members' })
  @ApiResponse({
    status: 404,
    description: 'Workspace or membership not found',
  })
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
    @Param('userId') memberId: string,
  ): Promise<void> {
    await this.workspacesService.removeMember(userId, workspaceId, memberId);
  }
}
