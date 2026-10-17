import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Page, PageType, PublicationStatus } from '@prisma/client';

export class PageEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly workspaceId: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly projectId: string | null;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description:
      'Id родительского документа, null если документ лежит в корне проекта',
  })
  readonly parentPageId: string | null;

  @ApiProperty({ example: 'Введение' })
  readonly title: string;

  @ApiPropertyOptional({ example: '📄' })
  readonly icon: string | null;

  @ApiProperty({ enum: PageType, example: PageType.DOC })
  readonly type: PageType;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Создатель страницы',
  })
  readonly authorId: string;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Кто последним изменил контент страницы',
  })
  readonly updatedById: string;

  @ApiProperty({ example: 0 })
  readonly position: number;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly createdAt: Date;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly updatedAt: Date;

  @ApiPropertyOptional({ example: 'vvedenie', nullable: true })
  readonly slug: string | null;

  @ApiPropertyOptional({ example: 'Введение в проект', nullable: true })
  readonly seoTitle: string | null;

  @ApiPropertyOptional({
    example: 'Короткое описание для карточки ленты',
    nullable: true,
  })
  readonly seoDescription: string | null;

  @ApiPropertyOptional({
    enum: PublicationStatus,
    nullable: true,
    example: PublicationStatus.PUBLISHED,
  })
  readonly publicationStatus: PublicationStatus | null;

  @ApiPropertyOptional({
    example: '2026-08-03T00:00:00.000Z',
    nullable: true,
  })
  readonly publishedAt: Date | null;

  constructor(
    id: string,
    workspaceId: string,
    projectId: string | null,
    parentPageId: string | null,
    title: string,
    icon: string | null,
    type: PageType,
    authorId: string,
    updatedById: string,
    position: number,
    createdAt: Date,
    updatedAt: Date,
    slug: string | null,
    seoTitle: string | null,
    seoDescription: string | null,
    publicationStatus: PublicationStatus | null,
    publishedAt: Date | null,
  ) {
    this.id = id;
    this.workspaceId = workspaceId;
    this.projectId = projectId;
    this.parentPageId = parentPageId;
    this.title = title;
    this.icon = icon;
    this.type = type;
    this.authorId = authorId;
    this.updatedById = updatedById;
    this.position = position;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.slug = slug;
    this.seoTitle = seoTitle;
    this.seoDescription = seoDescription;
    this.publicationStatus = publicationStatus;
    this.publishedAt = publishedAt;
  }

  static fromModel(page: Page): PageEntity {
    return new PageEntity(
      page.id,
      page.workspaceId,
      page.projectId,
      page.parentPageId,
      page.title,
      page.icon,
      page.type,
      page.authorId,
      page.updatedById,
      page.position,
      page.createdAt,
      page.updatedAt,
      page.slug,
      page.seoTitle,
      page.seoDescription,
      page.publicationStatus,
      page.publishedAt,
    );
  }
}
