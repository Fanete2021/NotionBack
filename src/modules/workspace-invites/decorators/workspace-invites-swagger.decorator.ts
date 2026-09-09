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
  return applyDecorators(
    ApiBearerAuth(),
    ApiTags('Workspace Invites'),
  );
}

function WorkspaceInvitesCreateResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create an invite link for a workspace (owner or admin)',
    }),
    ApiParam({ name: 'workspaceId', type: String, description: 'Workspace id' }),
    ApiResponse({
      status: 201,
      description: 'Invite link created',
      type: WorkspaceInviteEntity,
    }),
    ApiResponse({
      status: 403,
      description:
        'Not allowed to manage members, role cannot be granted via invite, or the permanent invite limit is reached',
    }),
    ApiResponse({ status: 404, description: 'Workspace not found' }),
  );
}

function WorkspaceInvitesListResponse() {
  return applyDecorators(
    ApiOperation({
      summary:
        'List permanent invite links of a workspace (owner or admin). Temporary links are not listed: they live in Redis and expire on their own',
    }),
    ApiParam({ name: 'workspaceId', type: String, description: 'Workspace id' }),
    ApiResponse({ status: 200, type: [WorkspaceInviteSummaryEntity] }),
    ApiResponse({ status: 403, description: 'Not allowed to manage members' }),
    ApiResponse({ status: 404, description: 'Workspace not found' }),
  );
}

function WorkspaceInvitesRevokeResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Revoke a permanent invite link (owner or admin)',
    }),
    ApiParam({ name: 'workspaceId', type: String, description: 'Workspace id' }),
    ApiParam({ name: 'inviteId', type: String, description: 'Invite id' }),
    ApiResponse({ status: 204, description: 'Invite revoked' }),
    ApiResponse({ status: 403, description: 'Not allowed to manage members' }),
    ApiResponse({
      status: 404,
      description: 'Workspace or invite not found',
    }),
  );
}

export {
  WorkspaceInvitesControllerResponse,
  WorkspaceInvitesCreateResponse,
  WorkspaceInvitesListResponse,
  WorkspaceInvitesRevokeResponse,
};
