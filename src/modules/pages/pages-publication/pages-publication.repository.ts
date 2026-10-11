import { isNotFoundError } from '@common/utils';
import { Injectable } from '@nestjs/common';
import { Page, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma';

@Injectable()
export class PagesPublicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  updatePublication(
    id: string,
    data: Prisma.PageUncheckedUpdateInput,
  ): Promise<Page | null> {
    return this.prisma.page
      .update({
        where: { id, deletedAt: null },
        data,
      })
      .catch((error) => {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      });
  }
}
