import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageCommentAuthorEntity } from './page-comment-author.entity';

export class PageCommentEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly pageId: string;

  @ApiProperty({ example: 'Нужно уточнить формулировку.' })
  readonly body: string;

  @ApiPropertyOptional({
    example: 'anchor-mark-uuid',
    description:
      'Id mark/anchor в TipTap; отсутствует — комментарий к странице',
    nullable: true,
  })
  readonly anchorId: string | null;

  @ApiProperty({ example: false })
  readonly resolved: boolean;

  @ApiPropertyOptional({ example: '2026-08-03T00:00:00.000Z', nullable: true })
  readonly resolvedAt: Date | null;

  @ApiPropertyOptional({ type: PageCommentAuthorEntity, nullable: true })
  readonly resolvedBy: PageCommentAuthorEntity | null;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly createdAt: Date;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly updatedAt: Date;

  @ApiProperty({ type: PageCommentAuthorEntity })
  readonly authorInfo: PageCommentAuthorEntity;

  constructor(props: {
    id: string;
    pageId: string;
    body: string;
    anchorId: string | null;
    resolved: boolean;
    resolvedAt: Date | null;
    resolvedBy: PageCommentAuthorEntity | null;
    createdAt: Date;
    updatedAt: Date;
    authorInfo: PageCommentAuthorEntity;
  }) {
    this.id = props.id;
    this.pageId = props.pageId;
    this.body = props.body;
    this.anchorId = props.anchorId;
    this.resolved = props.resolved;
    this.resolvedAt = props.resolvedAt;
    this.resolvedBy = props.resolvedBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.authorInfo = props.authorInfo;
  }
}
