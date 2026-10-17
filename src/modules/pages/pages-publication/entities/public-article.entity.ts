import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class PublicArticleAuthorEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: 'Иван Иванов' })
  readonly name: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  readonly avatarUrl: string | null;

  constructor(id: string, name: string, avatarUrl: string | null) {
    this.id = id;
    this.name = name;
    this.avatarUrl = avatarUrl;
  }
}

export class PublicArticleContentEntity {
  @ApiProperty({
    example: { type: 'doc', content: [] },
    description: 'TipTap document JSON',
  })
  readonly json: Prisma.JsonValue;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly updatedAt: Date;

  constructor(json: Prisma.JsonValue, updatedAt: Date) {
    this.json = json;
    this.updatedAt = updatedAt;
  }
}

export class PublicArticleEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: 'vvedenie' })
  readonly slug: string;

  @ApiProperty({ example: 'Введение' })
  readonly title: string;

  @ApiPropertyOptional({ example: '📄', nullable: true })
  readonly icon: string | null;

  @ApiPropertyOptional({ example: 'Введение в проект', nullable: true })
  readonly seoTitle: string | null;

  @ApiPropertyOptional({
    example: 'Короткое описание для карточки ленты',
    nullable: true,
  })
  readonly seoDescription: string | null;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly publishedAt: Date;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly updatedAt: Date;

  @ApiProperty({ type: () => PublicArticleAuthorEntity })
  readonly author: PublicArticleAuthorEntity;

  constructor(
    id: string,
    slug: string,
    title: string,
    icon: string | null,
    seoTitle: string | null,
    seoDescription: string | null,
    publishedAt: Date,
    updatedAt: Date,
    author: PublicArticleAuthorEntity,
  ) {
    this.id = id;
    this.slug = slug;
    this.title = title;
    this.icon = icon;
    this.seoTitle = seoTitle;
    this.seoDescription = seoDescription;
    this.publishedAt = publishedAt;
    this.updatedAt = updatedAt;
    this.author = author;
  }
}

export class PublicArticleDetailEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: 'vvedenie' })
  readonly slug: string;

  @ApiProperty({ example: 'Введение' })
  readonly title: string;

  @ApiPropertyOptional({ example: '📄', nullable: true })
  readonly icon: string | null;

  @ApiPropertyOptional({ example: 'Введение в проект', nullable: true })
  readonly seoTitle: string | null;

  @ApiPropertyOptional({
    example: 'Короткое описание для карточки ленты',
    nullable: true,
  })
  readonly seoDescription: string | null;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly publishedAt: Date;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly updatedAt: Date;

  @ApiProperty({ type: () => PublicArticleAuthorEntity })
  readonly author: PublicArticleAuthorEntity;

  @ApiProperty({ type: () => PublicArticleContentEntity })
  readonly content: PublicArticleContentEntity;

  constructor(
    id: string,
    slug: string,
    title: string,
    icon: string | null,
    seoTitle: string | null,
    seoDescription: string | null,
    publishedAt: Date,
    updatedAt: Date,
    author: PublicArticleAuthorEntity,
    content: PublicArticleContentEntity,
  ) {
    this.id = id;
    this.slug = slug;
    this.title = title;
    this.icon = icon;
    this.seoTitle = seoTitle;
    this.seoDescription = seoDescription;
    this.publishedAt = publishedAt;
    this.updatedAt = updatedAt;
    this.author = author;
    this.content = content;
  }
}
