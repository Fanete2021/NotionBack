import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageType } from '@prisma/client';

export class PageEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly workspaceId: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly projectId: string | null;

  @ApiProperty({ example: 'Введение' })
  readonly title: string;

  @ApiPropertyOptional({ example: '📄' })
  readonly icon: string | null;

  @ApiProperty({ enum: PageType, example: PageType.DOC })
  readonly type: PageType;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly authorId: string;

  @ApiProperty({ example: 0 })
  readonly position: number;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly createdAt: Date;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly updatedAt: Date;

  constructor(
    id: string,
    workspaceId: string,
    projectId: string | null,
    title: string,
    icon: string | null,
    type: PageType,
    authorId: string,
    position: number,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.workspaceId = workspaceId;
    this.projectId = projectId;
    this.title = title;
    this.icon = icon;
    this.type = type;
    this.authorId = authorId;
    this.position = position;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
