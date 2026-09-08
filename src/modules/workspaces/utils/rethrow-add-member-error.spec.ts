import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { rethrowAddMemberError } from './rethrow-add-member-error';

describe('rethrowAddMemberError', () => {
  it('бросает ConflictException для P2002', () => {
    const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
    });

    expect(() => rethrowAddMemberError(error)).toThrow(
      new ConflictException('User is already a member of this workspace'),
    );
  });

  it('бросает NotFoundException для P2003', () => {
    const error = new Prisma.PrismaClientKnownRequestError('foreign key', {
      code: 'P2003',
      clientVersion: 'test',
    });

    expect(() => rethrowAddMemberError(error)).toThrow(
      new NotFoundException('Workspace not found'),
    );
  });

  it('пробрасывает другие Prisma-коды без изменений', () => {
    const error = new Prisma.PrismaClientKnownRequestError('not found', {
      code: 'P2025',
      clientVersion: 'test',
    });

    expect(() => rethrowAddMemberError(error)).toThrow(error);
  });

  it('пробрасывает обычные ошибки без изменений', () => {
    const error = new Error('fail');

    expect(() => rethrowAddMemberError(error)).toThrow(error);
  });
});
