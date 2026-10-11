import { ApiWorkspaceForbidden } from '@common/decorators';
import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PageEntity } from '../../entities';
import {
  PublicArticleDetailEntity,
  PublicArticleListEntity,
} from '../entities';

function PagesPublicationControllerResponse(): ReturnType<
  typeof applyDecorators
> {
  return applyDecorators(ApiBearerAuth(), ApiTags('Pages'));
}

function PagesPublishResponse(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiOperation({
      summary: 'Publish a page: slug, SEO fields and publication status',
    }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiResponse({ status: 200, type: PageEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page not found' }),
    ApiResponse({ status: 409, description: 'Slug is already taken' }),
  );
}

function PublicArticlesControllerResponse(): ReturnType<
  typeof applyDecorators
> {
  return applyDecorators(ApiTags('Public articles'));
}

function PublicArticlesListResponse(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiOperation({ summary: 'List published articles, newest first' }),
    ApiResponse({ status: 200, type: PublicArticleListEntity }),
  );
}

function PublicArticleBySlugResponse(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiOperation({ summary: 'Get a published article by slug' }),
    ApiParam({ name: 'slug', type: String, description: 'Article slug' }),
    ApiResponse({ status: 200, type: PublicArticleDetailEntity }),
    ApiResponse({ status: 404, description: 'Article not found' }),
  );
}

export {
  PagesPublicationControllerResponse,
  PagesPublishResponse,
  PublicArticleBySlugResponse,
  PublicArticlesControllerResponse,
  PublicArticlesListResponse,
};
