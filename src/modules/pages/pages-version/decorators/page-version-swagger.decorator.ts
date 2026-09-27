import { ApiWorkspaceForbidden } from '@common/decorators';
import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PageContentEntity } from '../../pages-content/entities';
import { PageVersionListEntity } from '../entities';

function PagesVersionControllerResponse(): ReturnType<typeof applyDecorators> {
  return applyDecorators(ApiBearerAuth(), ApiTags('Pages'));
}

function PagesVersionListResponse(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiOperation({ summary: 'List page versions, newest first' }),
    ApiParam({ name: 'id', type: String, description: 'Page id' }),
    ApiResponse({ status: 200, type: PageVersionListEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page not found' }),
  );
}

function PagesVersionRestoreResponse(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiOperation({
      summary:
        'Restore a page version after saving the current content as a new version',
    }),
    ApiParam({ name: 'id', type: String, description: 'Page version id' }),
    ApiResponse({ status: 200, type: PageContentEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Page version or page not found' }),
  );
}

export {
  PagesVersionControllerResponse,
  PagesVersionListResponse,
  PagesVersionRestoreResponse,
};
