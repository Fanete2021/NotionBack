import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspaceMemberEntity } from '../../../entities/workspace-member.entity';
import { ApiUnauthorizedResponse } from '../common/api-unauthorized.decorator';
import { ApiForbiddenResponse } from '../common/api-forbidden.decorator';
import { ApiInternalServerErrorResponse } from '../common/api-internal-server-error.decorator';

export function WorkspaceMemberControllerResponse() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiTags('Участники воркспейса'),
    ApiUnauthorizedResponse(),
    ApiForbiddenResponse(),
    ApiInternalServerErrorResponse(),
  );
}

export function WorkspaceMemberListMembersResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Получить список участников воркспейса' }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'ID воркспейса',
    }),
    ApiResponse({
      status: 200,
      description: 'Список участников успешно получен',
      type: [WorkspaceMemberEntity],
    }),
  );
}

export function WorkspaceMemberAddMemberResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Добавить участника в воркспейс' }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'ID воркспейса',
    }),
    ApiResponse({
      status: 201,
      description: 'Участник успешно добавлен',
      type: WorkspaceMemberEntity,
    }),
  );
}

export function WorkspaceMemberChangeMemberRoleResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Изменить роль участника в воркспейсе' }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'ID воркспейса',
    }),
    ApiParam({ name: 'userId', type: String, description: 'ID участника' }),
    ApiResponse({
      status: 200,
      description: 'Роль участника успешно изменена',
      type: WorkspaceMemberEntity,
    }),
  );
}

export function WorkspaceMemberRemoveMemberResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Удалить участника из воркспейса' }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'ID воркспейса',
    }),
    ApiParam({ name: 'userId', type: String, description: 'ID участника' }),
    ApiResponse({ status: 204, description: 'Участник успешно удален' }),
  );
}
