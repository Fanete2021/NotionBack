import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  ApiCreateDecorator,
  ApiDeleteDecorator,
  ApiFindAllByWorkspaceIdDecorator,
  ApiFindByIdDecorator,
  ApiUpdateDecorator,
} from './decorators';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageEntity } from './entities';
import { PagesService } from './pages.service';

@ApiBearerAuth()
@ApiTags('Pages')
@Controller()
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @Post('pages')
  @ApiCreateDecorator()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePageDto,
  ): Promise<PageEntity> {
    await this.workspacesService.assertMemberOf(dto.workspaceId, userId);
    return this.pagesService.create(dto.workspaceId, userId, dto);
  }

  @Get('pages/:id')
  @ApiFindByIdDecorator()
  async findById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<PageEntity> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return page;
  }

  @Patch('pages/:id')
  @ApiUpdateDecorator()
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
  ): Promise<PageEntity> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    return this.pagesService.update(page, dto);
  }

  @Delete('pages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteDecorator()
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    const page = await this.pagesService.findById(id);
    await this.workspacesService.assertMemberOf(page.workspaceId, userId);
    await this.pagesService.delete(page);
  }

  @Get('workspaces/:workspaceId/pages')
  @ApiFindAllByWorkspaceIdDecorator()
  async findAllByWorkspaceId(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Query('projectId') projectId?: string,
  ): Promise<PageEntity[]> {
    await this.workspacesService.assertMemberOf(workspaceId, userId);
    return this.pagesService.findAllByWorkspaceId(workspaceId, projectId);
  }
}
