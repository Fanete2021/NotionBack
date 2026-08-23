import { ApiResponse } from '@nestjs/swagger';

export const ApiWorkspaceForbidden = (): MethodDecorator =>
  ApiResponse({
    status: 403,
    description: 'You are not a member of this workspace',
  });
