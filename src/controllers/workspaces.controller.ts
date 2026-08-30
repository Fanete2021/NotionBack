import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Get,
  UseGuards,
} from '@nestjs/common';
import { WorkspacesService } from '../services/workspaces.service';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { CurrentUser } from '../decorators/swagger/common/current-user.decorator';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  WorkspacesControllerResponse,
  WorkspacesCreateWorkspaceResponse,
  WorkspacesFindAllByUserIdResponse,
  WorkspacesFindByIdResponse,
  WorkspacesUpdateResponse,
  WorkspacesDeleteResponse,
} from '../decorators/swagger/controller/workspace-swagger.decorator';

@WorkspacesControllerResponse()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @WorkspacesCreateWorkspaceResponse()
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<WorkspaceEntity> {
    return this.workspacesService.create(userId, dto.name);
  }

  @WorkspacesFindAllByUserIdResponse()
  @Get()
  findAllByUserId(
    @CurrentUser('id') userId: string,
  ): Promise<WorkspaceEntity[]> {
    return this.workspacesService.findAllByUserId(userId);
  }

  @WorkspacesFindByIdResponse()
  @Get(':workspaceId')
  findById(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceEntity> {
    return this.workspacesService.findById(workspaceId, userId);
  }

  @WorkspacesUpdateResponse()
  @Patch(':workspaceId')
  update(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceEntity> {
    return this.workspacesService.update(workspaceId, userId, dto);
  }

  @WorkspacesDeleteResponse()
  @Delete(':workspaceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.workspacesService.delete(workspaceId, userId);
  }
}
