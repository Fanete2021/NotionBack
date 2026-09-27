import { CurrentUser } from '@common/decorators';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { PageContentEntity } from '../pages-content/entities';
import { PagesService } from '../pages.service';
import {
  PagesVersionControllerResponse,
  PagesVersionListResponse,
  PagesVersionRestoreResponse,
} from './decorators';
import { ListPageVersionsQueryDto } from './dto';
import { PageVersionEntity, PageVersionListEntity } from './entities';
import { PagesVersionService } from './pages-version.service';

@PagesVersionControllerResponse()
@Controller()
export class PagesVersionController {
  constructor(
    private readonly pagesVersionService: PagesVersionService,
    private readonly pagesService: PagesService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @PagesVersionListResponse()
  @Get('pages/:id/versions')
  async list(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query() query: ListPageVersionsQueryDto,
  ): Promise<PageVersionListEntity> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);

    const result = await this.pagesVersionService.list(page.id, query);

    return new PageVersionListEntity(
      result.items.map(
        (item) =>
          new PageVersionEntity(
            item.id,
            item.pageId,
            item.authorId,
            item.label,
            item.createdAt,
          ),
      ),
      result.nextCursor,
    );
  }

  @PagesVersionRestoreResponse()
  @Post('versions/:id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<PageContentEntity> {
    const version = await this.pagesVersionService.findById(id);
    const page = await this.pagesService.findById(version.pageId);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);

    const content = await this.pagesVersionService.restore(version, userId);

    return new PageContentEntity(
      content.pageId,
      content.json,
      content.updatedAt,
    );
  }
}
