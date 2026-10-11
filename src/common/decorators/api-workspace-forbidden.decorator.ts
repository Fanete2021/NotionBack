import { ApiResponse } from '@nestjs/swagger';

export const ApiWorkspaceForbidden = (): MethodDecorator =>
  ApiResponse({
    status: 403,
    description: 'Вы не являетесь участником этого воркспейса',
  });
