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
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceEntity } from './entities/workspace.entity';
import {
  ApiUnauthorized,
  ApiWorkspaceMemberForbidden,
  ApiWorkspaceNotFound,
  ApiWorkspaceOwnerForbidden,
} from '../../common/decorators/api-responses.decorator';

@ApiBearerAuth()
@ApiTags('Workspaces')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a workspace for the current user' })
  @ApiResponse({
    status: 201,
    description: 'Workspace created',
    type: WorkspaceEntity,
  })
  @ApiUnauthorized()
  @ApiResponse({
    status: 403,
    description: 'Workspace limit reached (max per user)',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<WorkspaceEntity> {
    return this.workspacesService.create(userId, dto.name);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workspaces of the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of user workspaces',
    type: [WorkspaceEntity],
  })
  @ApiUnauthorized()
  async findAllByUserId(
    @CurrentUser('id') userId: string,
  ): Promise<WorkspaceEntity[]> {
    return this.workspacesService.findAllByUserId(userId);
  }

  @Get(':workspaceId')
  @ApiOperation({ summary: 'Get a workspace by id' })
  @ApiParam({
    name: 'workspaceId',
    type: String,
    description: 'Workspace id',
  })
  @ApiResponse({
    status: 200,
    description: 'Workspace found',
    type: WorkspaceEntity,
  })
  @ApiWorkspaceMemberForbidden()
  @ApiWorkspaceNotFound()
  async findById(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceEntity> {
    return this.workspacesService.findById(userId, workspaceId);
  }

  @Patch(':workspaceId')
  @ApiOperation({ summary: 'Update a workspace (owner only)' })
  @ApiParam({
    name: 'workspaceId',
    type: String,
    description: 'Workspace id',
  })
  @ApiResponse({
    status: 200,
    description: 'Workspace updated',
    type: WorkspaceEntity,
  })
  @ApiWorkspaceOwnerForbidden()
  @ApiWorkspaceNotFound()
  async update(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceEntity> {
    return this.workspacesService.update(userId, workspaceId, dto);
  }

  @Delete(':workspaceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workspace (owner only)' })
  @ApiParam({
    name: 'workspaceId',
    type: String,
    description: 'Workspace id',
  })
  @ApiResponse({ status: 204, description: 'Workspace deleted' })
  @ApiWorkspaceOwnerForbidden()
  @ApiWorkspaceNotFound()
  async delete(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<void> {
    await this.workspacesService.delete(userId, workspaceId);
  }
}
