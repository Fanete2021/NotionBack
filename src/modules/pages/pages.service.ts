import { ProjectsRepository } from '@modules/projects/projects.repository';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Prisma } from '@prisma/client';
import { CreatePageDto, UpdatePageDto } from './dto';
import { PageEntity } from './entities';
import { PagesRepository } from './pages.repository';

@Injectable()
export class PagesService {
  constructor(
    private readonly pagesRepository: PagesRepository,
    private readonly projectsRepository: ProjectsRepository,
    @InjectPinoLogger(PagesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(
    workspaceId: string,
    authorId: string,
    dto: CreatePageDto,
  ): Promise<PageEntity> {
    await this.assertProjectInWorkspace(workspaceId, dto.projectId);

    const page = await this.pagesRepository.create(workspaceId, authorId, {
      projectId: dto.projectId,
      title: dto.title,
      icon: dto.icon ?? null,
      type: dto.type ?? 'DOC',
    });

    this.logger.info(
      { pageId: page.id, workspaceId, userId: authorId, action: 'page_create' },
      'page created',
    );

    return page;
  }

  async findAllByWorkspaceId(
    workspaceId: string,
    projectId?: string,
  ): Promise<PageEntity[]> {
    return this.pagesRepository.findAllByWorkspaceId(workspaceId, projectId);
  }

  async reorder(
    workspaceId: string,
    projectId: string,
    orderedIds: string[],
  ): Promise<PageEntity[]> {
    await this.assertProjectInWorkspace(workspaceId, projectId);

    const pages = await this.pagesRepository.reorder(
      workspaceId,
      projectId,
      orderedIds,
    );

    if (!pages) {
      throw new BadRequestException(
        'orderedIds должен содержать ровно все документы-соседи проекта',
      );
    }

    return pages;
  }

  async findById(id: string): Promise<PageEntity> {
    const page = await this.pagesRepository.findById(id);
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  async update(page: PageEntity, dto: UpdatePageDto): Promise<PageEntity> {
    const payload: Prisma.PageUncheckedUpdateInput = {
      title: dto.title,
      icon: dto.icon,
      type: dto.type,
    };

    if (dto.projectId !== undefined && dto.projectId !== page.projectId) {
      await this.assertProjectInWorkspace(page.workspaceId, dto.projectId);
      payload.projectId = dto.projectId;
      payload.position = await this.pagesRepository.nextPosition(
        page.workspaceId,
        dto.projectId,
      );
    }

    const updated = await this.pagesRepository.update(page.id, payload);
    if (!updated) {
      throw new NotFoundException('Page not found');
    }

    this.logger.info(
      { pageId: page.id, workspaceId: page.workspaceId, action: 'page_update' },
      'page updated',
    );

    return updated;
  }

  async delete(page: PageEntity): Promise<void> {
    const deleted = await this.pagesRepository.softDelete(page.id);
    if (!deleted) {
      throw new NotFoundException('Page not found');
    }

    this.logger.info(
      { pageId: page.id, workspaceId: page.workspaceId, action: 'page_delete' },
      'page deleted',
    );
  }

  private async assertProjectInWorkspace(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.workspaceId !== workspaceId) {
      throw new BadRequestException(
        'Project not found or not in the same workspace',
      );
    }
  }
}
