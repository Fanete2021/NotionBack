import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

function rethrowAddMemberError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictException('User is already a member of this workspace');
    }

    if (error.code === 'P2003') {
      throw new NotFoundException('Workspace not found');
    }
  }

  throw error;
}

export { rethrowAddMemberError };
