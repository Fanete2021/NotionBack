import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { PagesService } from '../pages.service';
import {
  PagesGetContentResponse,
  PagesUpdateContentResponse,
} from './decorators';
import { PageContentEntity } from './entities';
import { PagesContentMapper } from './page-content.mapper';
import { PagesContentService } from './pages-content.service';

@ApiBearerAuth()
@ApiTags('Pages version')
@Controller('pages')
export class PagesContentController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly pagesContentService: PagesContentService,
    private readonly pagesContentMapper: PagesContentMapper,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @Get(':id/content')
  @PagesGetContentResponse()
  async getContent(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<PageContentEntity> {
    const page = await this.pagesService.findById(id);

    await this.workspacesService.assertMemberOf(page.workspaceId, userId);

    const content = await this.pagesContentService.getContent(page);

    return this.pagesContentMapper.toEntity(content);
  }

  @Put(':id/content')
  @PagesUpdateContentResponse()
  async updateContent(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<PageContentEntity> {
    const page = await this.pagesService.findById(id);

    await this.workspacesService.assertMemberOf(page.workspaceId, userId);

    const content = await this.pagesContentService.updateContent(
      page,
      body,
      userId,
    );

    return this.pagesContentMapper.toEntity(content);
  }
}
