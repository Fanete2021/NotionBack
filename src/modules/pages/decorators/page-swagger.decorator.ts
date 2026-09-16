import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiWorkspaceForbidden } from '@common/decorators';
import { PageEntity } from '@modules/pages/entities';
import { PageContentEntity } from '@modules/pages/entities';

function PagesControllerResponse() {
  return applyDecorators(ApiBearerAuth(), ApiTags('Pages'));
}

function PagesCreateResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a page in a project' }),
    ApiResponse({
      status: 201,
      description: 'Page created',
      type: PageEntity,
    }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Project not found' }),
  );
}

function PagesFindByIdResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a page by id' }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiResponse({ status: 200, type: PageEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page not found' }),
  );
}

function PagesUpdateResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update a page (title, icon, type, project)',
    }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiResponse({ status: 200, type: PageEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page or project not found' }),
  );
}

function PagesDeleteResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Soft-delete a page (moves it to trash)' }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiResponse({ status: 204, description: 'Page deleted' }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page not found' }),
  );
}

function PagesGetContentResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a page content (TipTap JSON)' }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiResponse({ status: 200, type: PageContentEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page not found' }),
  );
}

function PagesUpdateContentResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Overwrite a page content (TipTap JSON)' }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiBody({
      schema: { type: 'object', example: { type: 'doc', content: [] } },
      description: 'TipTap document JSON',
    }),
    ApiResponse({ status: 200, type: PageContentEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page not found' }),
    ApiResponse({
      status: 413,
      description: 'Page content exceeds the size limit',
    }),
  );
}

function PagesFindAllByWorkspaceIdResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get pages of a workspace (optionally of a project)',
    }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'Workspace id',
    }),
    ApiQuery({
      name: 'projectId',
      required: false,
      type: String,
      description: 'Filter by project id',
    }),
    ApiResponse({ status: 200, type: [PageEntity] }),
    ApiWorkspaceForbidden(),
  );
}

export {
  PagesControllerResponse,
  PagesCreateResponse,
  PagesFindByIdResponse,
  PagesUpdateResponse,
  PagesDeleteResponse,
  PagesGetContentResponse,
  PagesUpdateContentResponse,
  PagesFindAllByWorkspaceIdResponse,
};
