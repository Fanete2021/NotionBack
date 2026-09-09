import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectsRepository } from '../projects/projects.repository';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageEntity } from './entities/page.entity';
import { PagesRepository } from './pages.repository';

@Injectable()
export class PagesService {
  constructor(
    private readonly pagesRepository: PagesRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async create(
    workspaceId: string,
    authorId: string,
    dto: CreatePageDto,
  ): Promise<PageEntity> {
    await this.assertProjectInWorkspace(workspaceId, dto.projectId);

    return this.pagesRepository.create(workspaceId, authorId, {
      projectId: dto.projectId,
      title: dto.title,
      icon: dto.icon ?? null,
      type: dto.type ?? 'DOC',
    });
  }

  async findAllByWorkspaceId(
    workspaceId: string,
    projectId?: string,
  ): Promise<PageEntity[]> {
    return this.pagesRepository.findAllByWorkspaceId(workspaceId, projectId);
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
    return updated;
  }

  async delete(page: PageEntity): Promise<void> {
    const deleted = await this.pagesRepository.softDelete(page.id);
    if (!deleted) {
      throw new NotFoundException('Page not found');
    }
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
