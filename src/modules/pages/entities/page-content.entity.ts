import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class PageContentEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly pageId: string;

  @ApiProperty({
    example: { type: 'doc', content: [] },
    description: 'TipTap document JSON',
  })
  readonly json: Prisma.JsonValue;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly updatedAt: Date;

  constructor(pageId: string, json: Prisma.JsonValue, updatedAt: Date) {
    this.pageId = pageId;
    this.json = json;
    this.updatedAt = updatedAt;
  }
}
