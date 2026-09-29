import { ApiWorkspaceForbidden } from '@common/decorators';
import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  EmptyTrashResultEntity,
  PageEntity,
  TrashedPageEntity,
} from '../entities';

function PagesControllerResponse() {
  return applyDecorators(ApiBearerAuth(), ApiTags('Pages'));
}

function PagesCreateResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Создать документ в проекте' }),
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
    ApiOperation({ summary: 'Получить документ по id' }),
    ApiParam({ name: 'id', type: String, description: 'Id документа' }),
    ApiResponse({ status: 200, type: PageEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Документ не найден' }),
  );
}

function PagesUpdateResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Обновить документ (заголовок, иконку, тип, проект)',
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
      summary: 'Мягкое удаление документа (перемещает в корзину)',
    }),
    ApiParam({ name: 'id', type: String, description: 'Id документа' }),
    ApiResponse({ status: 204, description: 'Документ удалён' }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Документ не найден' }),
  );
}

function PagesTrashResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Получить удалённые документы воркспейса (экран Корзины)',
    }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'Id воркспейса',
    }),
    ApiQuery({
      name: 'q',
      required: false,
      type: String,
      description:
        'Поиск по названию документа, названию раздела (проекта), имени/email того, кто удалил',
    }),
    ApiResponse({ status: 200, type: [TrashedPageEntity] }),
    ApiWorkspaceForbidden(),
  );
}

function PagesEmptyTrashResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Очистить корзину воркспейса (удалить все документы навсегда)',
    }),
    ApiParam({
      name: 'workspaceId',
      type: String,
      description: 'Id воркспейса',
    }),
    ApiResponse({ status: 200, type: EmptyTrashResultEntity }),
    ApiWorkspaceForbidden(),
  );
}

function PagesRestoreResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Восстановить документ из корзины' }),
    ApiParam({ name: 'id', type: String, description: 'Id документа' }),
    ApiResponse({ status: 201, type: PageEntity }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Документ не найден в корзине' }),
  );
}

function PagesHardDeleteResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Окончательно удалить документ вместе с контентом и версиями',
    }),
    ApiParam({ name: 'id', type: String, description: 'Id документа' }),
    ApiResponse({ status: 204, description: 'Документ удалён навсегда' }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Документ не найден' }),
  );
}

function PagesFindAllByWorkspaceIdResponse() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Получить документы воркспейса (опционально — конкретного проекта)',
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
  PagesDeleteResponse,
  PagesEmptyTrashResponse,
  PagesFindAllByWorkspaceIdResponse,
  PagesFindByIdResponse,
  PagesHardDeleteResponse,
  PagesReorderResponse,
  PagesRestoreResponse,
  PagesTrashResponse,
  PagesUpdateResponse,
};
