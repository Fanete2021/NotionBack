import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PageVersionEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly pageId: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly authorId: string;

  @ApiPropertyOptional({ example: '2026-09-27T06:00:00.000Z' })
  readonly label: string | null;

  @ApiProperty({ example: '2026-09-27T06:00:00.000Z' })
  readonly createdAt: Date;

  constructor(
    id: string,
    pageId: string,
    authorId: string,
    label: string | null,
    createdAt: Date,
  ) {
    this.id = id;
    this.pageId = pageId;
    this.authorId = authorId;
    this.label = label;
    this.createdAt = createdAt;
  }
}
