import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export function ApiUnauthorized(): MethodDecorator & ClassDecorator {
  return ApiResponse({ status: 401, description: 'Not authenticated' });
}

export function ApiWorkspaceMemberForbidden(): MethodDecorator &
  ClassDecorator {
  return applyDecorators(
    ApiUnauthorized(),
    ApiResponse({
      status: 403,
      description: 'You are not a member of this workspace',
    }),
  );
}

export function ApiWorkspaceOwnerForbidden(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiUnauthorized(),
    ApiResponse({
      status: 403,
      description: 'Only the workspace owner can do this',
    }),
  );
}

export function ApiWorkspaceNotFound(): MethodDecorator & ClassDecorator {
  return ApiResponse({ status: 404, description: 'Workspace not found' });
}

export function ApiProjectNotFound(): MethodDecorator & ClassDecorator {
  return ApiResponse({ status: 404, description: 'Project not found' });
}
