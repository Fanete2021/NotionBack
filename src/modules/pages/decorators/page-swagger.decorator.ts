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
    ApiOperation({ summary: 'Создание документа в проекте' }),
    ApiResponse({
      status: 201,
      description: 'Документ создан',
      type: PageEntity,
    }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Проект не найден' }),
  );
}

function PagesFindByIdResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Получение документа по id' }),
    ApiParam({ name: 'id', type: String, description: 'Id документа' }),
    ApiResponse({ status: 200, type: PageEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Документ не найден' }),
  );
}

function PagesUpdateResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Обновление документа (название, иконка, тип, проект)',
    }),
    ApiParam({ name: 'id', type: String, description: 'Id документа' }),
    ApiResponse({ status: 200, type: PageEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Документ или проект не найден' }),
  );
}

function PagesDeleteResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Мягкое удаление документа (перемещение в корзину)',
    }),
    ApiParam({ name: 'id', type: String, description: 'Id документа' }),
    ApiResponse({ status: 204, description: 'Документ удалён' }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Документ не найден' }),
  );
}

function PagesGetContentResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Получение содержимого документа (TipTap JSON)' }),
    ApiParam({ name: 'id', type: String, description: 'Id документа' }),
    ApiResponse({ status: 200, type: PageContentEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Документ не найден' }),
  );
}

function PagesUpdateContentResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Перезапись содержимого документа (TipTap JSON)' }),
    ApiParam({ name: 'id', type: String, description: 'Id документа' }),
    ApiBody({
      schema: { type: 'object', example: { type: 'doc', content: [] } },
      description: 'JSON-документ TipTap',
    }),
    ApiResponse({ status: 200, type: PageContentEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Документ не найден' }),
    ApiResponse({
      status: 413,
      description: 'Содержимое документа превышает лимит размера',
    }),
  );
}

function PagesFindAllByWorkspaceIdResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Получение документов воркспейса (опционально в рамках проекта)',
    }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'Id воркспейса',
    }),
    ApiQuery({
      name: 'projectId',
      required: false,
      type: String,
      description: 'Фильтр по id проекта',
    }),
    ApiResponse({ status: 200, type: [PageEntity] }),
    ApiWorkspaceForbidden(),
  );
}

function PagesReorderResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Переупорядочивание документов внутри проекта (drag and drop)',
    }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'Id воркспейса',
    }),
    ApiResponse({ status: 200, type: [PageEntity] }),
    ApiResponse({
      status: 400,
      description: 'orderedIds должен содержать ровно все документы проекта',
    }),
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
  PagesReorderResponse,
};
