import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiWorkspaceForbidden } from '@common/decorators';
import { PageCommentEntity } from '../entities';

function PageCommentsControllerResponse() {
  return applyDecorators(ApiBearerAuth(), ApiTags('Комментарии к странице'));
}

function PageCommentsListResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Получить список комментариев страницы' }),
    ApiParam({ name: 'pageId', type: String, description: 'ID страницы' }),
    ApiQuery({
      name: 'anchorId',
      required: false,
      type: String,
      description: 'Фильтр по id mark/anchor в TipTap',
    }),
    ApiQuery({
      name: 'resolved',
      required: false,
      type: Boolean,
      description: 'Фильтр по статусу «решён» (true / false)',
    }),
    ApiResponse({
      status: 200,
      description: 'Список комментариев успешно получен',
      type: [PageCommentEntity],
    }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Страница не найдена' }),
  );
}

function PageCommentsCreateResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Создать комментарий к странице' }),
    ApiParam({ name: 'pageId', type: String, description: 'ID страницы' }),
    ApiResponse({
      status: 201,
      description: 'Комментарий успешно создан',
      type: PageCommentEntity,
    }),
    ApiWorkspaceForbidden(),
    ApiResponse({ status: 404, description: 'Страница не найдена' }),
  );
}

function PageCommentsUpdateResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Изменить текст своего комментария' }),
    ApiParam({ name: 'pageId', type: String, description: 'ID страницы' }),
    ApiParam({
      name: 'commentId',
      type: String,
      description: 'ID комментария',
    }),
    ApiResponse({
      status: 200,
      description: 'Комментарий успешно обновлён',
      type: PageCommentEntity,
    }),
    ApiWorkspaceForbidden(),
    ApiResponse({
      status: 403,
      description: 'Редактировать может только автор комментария',
    }),
    ApiResponse({
      status: 404,
      description: 'Страница или комментарий не найдены',
    }),
  );
}

function PageCommentsSetResolvedResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Закрыть комментарий (resolved) или снова открыть',
    }),
    ApiParam({ name: 'pageId', type: String, description: 'ID страницы' }),
    ApiParam({
      name: 'commentId',
      type: String,
      description: 'ID комментария',
    }),
    ApiResponse({
      status: 200,
      description: 'Статус комментария обновлён',
      type: PageCommentEntity,
    }),
    ApiWorkspaceForbidden(),
    ApiResponse({
      status: 404,
      description: 'Страница или комментарий не найдены',
    }),
  );
}

function PageCommentsDeleteResponse() {
  return applyDecorators(
    ApiOperation({ summary: 'Удалить свой комментарий' }),
    ApiParam({ name: 'pageId', type: String, description: 'ID страницы' }),
    ApiParam({
      name: 'commentId',
      type: String,
      description: 'ID комментария',
    }),
    ApiResponse({ status: 204, description: 'Комментарий удалён' }),
    ApiWorkspaceForbidden(),
    ApiResponse({
      status: 403,
      description: 'Удалить может только автор комментария',
    }),
    ApiResponse({
      status: 404,
      description: 'Страница или комментарий не найдены',
    }),
  );
}

export {
  PageCommentsControllerResponse,
  PageCommentsListResponse,
  PageCommentsCreateResponse,
  PageCommentsUpdateResponse,
  PageCommentsSetResolvedResponse,
  PageCommentsDeleteResponse,
};
