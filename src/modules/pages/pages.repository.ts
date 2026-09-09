import { Injectable } from '@nestjs/common';
import { PageType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EMPTY_DOCUMENT } from './constants';
import { PageEntity } from './entities';

export type CreatePageData = {
  projectId: string;
  title: string;
  icon: string | null;
  type: PageType;
};

@Injectable()
export class PagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    authorId: string,
    data: CreatePageData,
  ): Promise<PageEntity> {
    const page = await this.prisma.$transaction(async (tx) => {
      const { _max } = await tx.page.aggregate({
        where: {
          workspaceId,
          projectId: data.projectId,
          parentPageId: null,
        },
        _max: { position: true },
      });

      const position = (_max.position ?? -1) + 1;

      const created = await tx.page.create({
        data: {
          workspaceId,
          authorId,
          projectId: data.projectId,
          title: data.title,
          icon: data.icon,
          type: data.type,
          position,
        },
      });

      await tx.pageContent.create({
        data: { pageId: created.id, json: EMPTY_DOCUMENT },
      });

      return created;
    });

    return page;
  }

  async nextPosition(workspaceId: string, projectId: string): Promise<number> {
    const { _max } = await this.prisma.page.aggregate({
      where: {
        workspaceId,
        projectId,
        parentPageId: null,
      },
      _max: { position: true },
    });

    return (_max.position ?? -1) + 1;
  }

  async findAllByWorkspaceId(
    workspaceId: string,
    projectId?: string,
  ): Promise<PageEntity[]> {
    return this.prisma.page.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { position: 'asc' },
    });
  }

  async findById<T extends Prisma.PageInclude>(
    id: string,
    include?: T,
  ): Promise<Prisma.PageGetPayload<{ include: T }> | null> {
    const page = await this.prisma.page.findUnique({
      where: { id, deletedAt: null },
      include,
    });

    if (!page) {
      return null;
    }

    return page as Prisma.PageGetPayload<{ include: T }>;
  }

  async update(
    id: string,
    data: Prisma.PageUncheckedUpdateInput,
  ): Promise<PageEntity | null> {
    const page = await this.prisma.page
      .update({
        where: { id, deletedAt: null },
        data,
      })
      .catch((error) => {
        if (this.isNotFoundError(error)) {
          return null;
        }
        throw error;
      });

    return page;
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      await this.prisma.page.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  private isNotFoundError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }
}
