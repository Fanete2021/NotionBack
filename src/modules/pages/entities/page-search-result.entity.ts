import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageType } from '@prisma/client';
import { PageSearchPathItemEntity } from './page-search-path-item.entity';

export type PageSearchMatchedIn = 'title' | 'content';

export class PageSearchResultEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly pageId: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly workspaceId: string;

  @ApiPropertyOptional({ nullable: true })
  readonly projectId: string | null;

  @ApiPropertyOptional({ nullable: true })
  readonly parentPageId: string | null;

  @ApiProperty({ example: 'Отчёт Q4' })
  readonly title: string;

  @ApiPropertyOptional({ example: '📄', nullable: true })
  readonly icon: string | null;

  @ApiProperty({ enum: PageType })
  readonly type: PageType;

  @ApiProperty({ enum: ['title', 'content'] })
  readonly matchedIn: PageSearchMatchedIn;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Фрагмент текста вокруг первого вхождения (для content)',
  })
  readonly snippet: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Смещение вхождения в тексте документа (для content)',
  })
  readonly matchOffset: number | null;

  @ApiProperty({
    type: [PageSearchPathItemEntity],
    description: 'Цепочка от проекта к документу',
  })
  readonly path: PageSearchPathItemEntity[];

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly updatedAt: Date;

  constructor(props: {
    pageId: string;
    workspaceId: string;
    projectId: string | null;
    parentPageId: string | null;
    title: string;
    icon: string | null;
    type: PageType;
    matchedIn: PageSearchMatchedIn;
    snippet: string | null;
    matchOffset: number | null;
    path: PageSearchPathItemEntity[];
    updatedAt: Date;
  }) {
    this.pageId = props.pageId;
    this.workspaceId = props.workspaceId;
    this.projectId = props.projectId;
    this.parentPageId = props.parentPageId;
    this.title = props.title;
    this.icon = props.icon;
    this.type = props.type;
    this.matchedIn = props.matchedIn;
    this.snippet = props.snippet;
    this.matchOffset = props.matchOffset;
    this.path = props.path;
    this.updatedAt = props.updatedAt;
  }
}
