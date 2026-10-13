import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  WorkspaceInviteEntity,
  WorkspaceInviteSummaryEntity,
} from '@modules/workspace-invites/entities';

function WorkspaceInvitesControllerResponse() {
  return applyDecorators(ApiBearerAuth(), ApiTags('Приглашения в воркспейс'));
}

function WorkspaceInvitesCreateResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Создать ссылку-приглашение в воркспейс (владелец или админ)',
    }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'Id воркспейса',
    }),
    ApiResponse({
      status: 201,
      description: 'Ссылка-приглашение создана',
      type: WorkspaceInviteEntity,
    }),
    ApiResponse({
      status: 403,
      description:
        'Нет права управлять участниками, роль нельзя выдать через приглашение, или достигнут лимит постоянных ссылок',
    }),
    ApiResponse({ status: 404, description: 'Воркспейс не найден' }),
  );
}

function WorkspaceInvitesListResponse() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Список ссылок-приглашений воркспейса (владелец или админ), включая токены и готовые URL. Возвращает постоянные ссылки (из базы) и активные временные (из Redis, с expiresAt)',
    }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'Id воркспейса',
    }),
    ApiResponse({ status: 200, type: [WorkspaceInviteSummaryEntity] }),
    ApiResponse({
      status: 403,
      description: 'Нет права управлять участниками',
    }),
    ApiResponse({ status: 404, description: 'Воркспейс не найден' }),
  );
}

function WorkspaceInvitesRevokeResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Отозвать постоянную ссылку-приглашение (владелец или админ)',
    }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'Id воркспейса',
    }),
    ApiParam({ name: 'inviteId', type: String, description: 'Id приглашения' }),
    ApiResponse({ status: 204, description: 'Приглашение отозвано' }),
    ApiResponse({
      status: 403,
      description: 'Нет права управлять участниками',
    }),
    ApiResponse({
      status: 404,
      description: 'Воркспейс или приглашение не найдены',
    }),
  );
}

export {
  WorkspaceInvitesControllerResponse,
  WorkspaceInvitesCreateResponse,
  WorkspaceInvitesListResponse,
  WorkspaceInvitesRevokeResponse,
};
