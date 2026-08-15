import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { EMPTY_DOCUMENT, PagesRepository } from './pages.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { PageEntity } from './entities/page.entity';
import { PageContentEntity } from './entities/page-content.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class PagesService {
  constructor(
    private readonly pagesRepository: PagesRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly configService: ConfigService,
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
      icon: null,
      coverUrl: null,
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

  async update(id: string, dto: UpdatePageDto): Promise<PageEntity> {
    const page = await this.pagesRepository.findById(id);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    if (dto.projectId !== undefined) {
      await this.assertProjectInWorkspace(page.workspaceId, dto.projectId);
    }

    const payload: Prisma.PageUncheckedUpdateInput = {
      title: dto.title,
      icon: dto.icon,
      coverUrl: dto.coverUrl,
      type: dto.type,
    };

    if (dto.projectId !== undefined) {
      payload.projectId = dto.projectId;
      payload.position = await this.nextPosition(
        page.workspaceId,
        dto.projectId,
      );
    }

    const updated = await this.pagesRepository.update(id, payload);
    if (!updated) {
      throw new NotFoundException('Page not found');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const page = await this.pagesRepository.findById(id);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const deleted = await this.pagesRepository.softDelete(id);
    if (!deleted) {
      throw new NotFoundException('Page not found');
    }
  }

  async getContent(id: string): Promise<PageContentEntity> {
    const page = await this.pagesRepository.findById(id);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const content = await this.pagesRepository.findContent(id);
    if (!content) {
      return new PageContentEntity(
        id,
        EMPTY_DOCUMENT as Prisma.JsonValue,
        new Date(),
      );
    }

    return content;
  }

  async updateContent(id: string, json: unknown): Promise<PageContentEntity> {
    const page = await this.pagesRepository.findById(id);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    if (json === null || json === undefined) {
      throw new BadRequestException('Page content must be a JSON value');
    }

    this.assertSizeWithinLimit(json);

    return this.pagesRepository.upsertContent(id, json);
  }

  private async nextPosition(
    workspaceId: string,
    projectId: string,
  ): Promise<number> {
    const pages = await this.pagesRepository.findAllByWorkspaceId(
      workspaceId,
      projectId,
    );
    return pages.length;
  }

  private assertSizeWithinLimit(json: unknown): void {
    const maxBytes = this.configService.get<number>(
      'MAX_PAGE_CONTENT_BYTES',
      1048576,
    );
    const size = Buffer.byteLength(JSON.stringify(json), 'utf8');

    if (size > maxBytes) {
      throw new PayloadTooLargeException(
        `Page content exceeds the size limit of ${maxBytes} bytes`,
      );
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
