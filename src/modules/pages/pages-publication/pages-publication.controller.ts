import { CurrentUser, Public } from '@common/decorators';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { EMPTY_DOCUMENT } from '../constants';
import { PageEntity } from '../entities';
import { PagesService } from '../pages.service';
import {
  PagesPublicationControllerResponse,
  PagesPublishResponse,
  PublicArticleBySlugResponse,
  PublicArticlesControllerResponse,
  PublicArticlesListResponse,
} from './decorators';
import { ListPublicArticlesQueryDto, PublishPageDto } from './dto';
import {
  PublicArticleAuthorEntity,
  PublicArticleContentEntity,
  PublicArticleDetailEntity,
  PublicArticleEntity,
  PublicArticleListEntity,
} from './entities';
import { PagesPublicationService } from './pages-publication.service';
import {
  PublicArticleDetailRow,
  PublicArticleRow,
} from './pages-publication.types';

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

@Public()
@PublicArticlesControllerResponse()
@Controller('public/articles')
export class PublicArticlesController {
  constructor(
    private readonly pagesPublicationService: PagesPublicationService,
  ) {}

  @PublicArticlesListResponse()
  @Get()
  async list(
    @Query() query: ListPublicArticlesQueryDto,
  ): Promise<PublicArticleListEntity> {
    const result = await this.pagesPublicationService.list(query);
    return new PublicArticleListEntity(
      result.items.map((item) => toPublicArticle(item)),
      result.nextCursor,
    );
  }

  @PublicArticleBySlugResponse()
  @Get(':slug')
  async findBySlug(
    @Param('slug') slug: string,
  ): Promise<PublicArticleDetailEntity> {
    const article = await this.pagesPublicationService.findBySlug(slug);
    return toPublicArticleDetail(article);
  }
}

function toPublicArticle(row: PublicArticleRow): PublicArticleEntity {
  if (row.slug === null || row.publishedAt === null) {
    throw new NotFoundException('Article not found');
  }

  return new PublicArticleEntity(
    row.id,
    row.slug,
    row.title,
    row.icon,
    row.seoTitle,
    row.seoDescription,
    row.publishedAt,
    row.updatedAt,
    new PublicArticleAuthorEntity(
      row.author.id,
      row.author.name,
      row.author.avatarUrl,
    ),
  );
}

function toPublicArticleDetail(
  row: PublicArticleDetailRow,
): PublicArticleDetailEntity {
  const article = toPublicArticle(row);

  return new PublicArticleDetailEntity(
    article.id,
    article.slug,
    article.title,
    article.icon,
    article.seoTitle,
    article.seoDescription,
    article.publishedAt,
    article.updatedAt,
    article.author,
    new PublicArticleContentEntity(
      row.content?.json ?? (EMPTY_DOCUMENT as Prisma.JsonValue),
      row.content?.updatedAt ?? row.updatedAt,
    ),
  );
}
