import { CurrentUser } from '@common/decorators';
import { Body, Controller, Param, Patch } from '@nestjs/common';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { PageEntity } from '../entities';
import { PagesService } from '../pages.service';
import {
  PagesPublicationControllerResponse,
  PagesPublishResponse,
} from './decorators';
import { PublishPageDto } from './dto';
import { PagesPublicationService } from './pages-publication.service';

@PagesPublicationControllerResponse()
@Controller()
export class PagesPublicationController {
  constructor(
    private readonly pagesPublicationService: PagesPublicationService,
    private readonly pagesService: PagesService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @PagesPublishResponse()
  @Patch('pages/:id/publication')
  async publish(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: PublishPageDto,
  ): Promise<PageEntity> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return this.pagesPublicationService.publish(page, dto);
  }
}
