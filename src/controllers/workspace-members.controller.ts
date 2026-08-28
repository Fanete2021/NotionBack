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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspacesService } from '../services/workspaces.service';
import { AddWorkspaceMemberDto } from '../dto/add-workspace-member.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { WorkspaceMemberEntity } from '../entities/workspace-member.entity';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard';
import { ApiUnauthorizedResponse } from '../decorators/api-unauthorized.decorator';
import { ApiForbiddenResponse } from '../decorators/api-forbidden.decorator';
import { ApiValidationErrorResponse } from '../decorators/api-bad-request.decorator';
import { ApiInternalServerErrorResponse } from '../decorators/api-internal-server-error.decorator';

@ApiBearerAuth()
@ApiTags('Участники воркспейса')
@ApiUnauthorizedResponse()
@ApiForbiddenResponse()
@ApiInternalServerErrorResponse()
@UseGuards(WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId/members')
export class WorkspaceMembersController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список участников воркспейса' })
  @ApiParam({ name: 'workspaceId', type: String, description: 'ID воркспейса' })
  @ApiResponse({
    status: 200,
    description: 'Список участников успешно получен',
    type: [WorkspaceMemberEntity],
  })
  listMembers(
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceMemberEntity[]> {
    return this.workspacesService.listMembers(workspaceId);
  }

  @Post()
  @ApiOperation({
    summary: 'Добавить участника в воркспейс',
    description:
      'Только владелец или админ. Админа может добавить только владелец.',
  })
  @ApiParam({ name: 'workspaceId', type: String, description: 'ID воркспейса' })
  @ApiResponse({
    status: 201,
    description: 'Участник успешно добавлен',
    type: WorkspaceMemberEntity,
  })
  @ApiValidationErrorResponse()
  @ApiResponse({
    status: 404,
    description: 'Воркспейс или пользователь не найден',
  })
  @ApiResponse({
    status: 409,
    description: 'Пользователь уже является участником',
  })
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

  @Patch(':userId')
  @ApiOperation({
    summary: 'Изменить роль участника',
    description: 'Владелец может назначать админов.',
  })
  @ApiParam({ name: 'workspaceId', type: String, description: 'ID воркспейса' })
  @ApiParam({ name: 'userId', type: String, description: 'ID пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Роль успешно обновлена',
    type: WorkspaceMemberEntity,
  })
  @ApiValidationErrorResponse()
  @ApiResponse({
    status: 404,
    description: 'Воркспейс или членство не найдено',
  })
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

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить участника из воркспейса',
    description: 'Только владелец или админ.',
  })
  @ApiParam({ name: 'workspaceId', type: String, description: 'ID воркспейса' })
  @ApiParam({ name: 'userId', type: String, description: 'ID пользователя' })
  @ApiResponse({ status: 204, description: 'Участник успешно удален' })
  @ApiResponse({
    status: 404,
    description: 'Воркспейс или членство не найдено',
  })
  removeMember(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') memberId: string,
  ): Promise<void> {
    return this.workspacesService.removeMember(userId, workspaceId, memberId);
  }
}
