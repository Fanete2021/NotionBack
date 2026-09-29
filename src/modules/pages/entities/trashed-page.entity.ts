import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageType } from '@prisma/client';
import { PageActorEntity } from './page-actor.entity';

export class TrashedPageEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly workspaceId: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly projectId: string | null;

  @ApiProperty({ example: 'Отчёт Q4' })
  readonly title: string;

  @ApiPropertyOptional({ example: '📄' })
  readonly icon: string | null;

  @ApiProperty({ enum: PageType, example: PageType.DOC })
  readonly type: PageType;

  @ApiProperty({
    type: PageActorEntity,
    description: 'Автор документа',
  })
  readonly author: PageActorEntity;

  @ApiProperty({ example: '2026-09-25T10:00:00.000Z' })
  readonly deletedAt: Date;

  @ApiPropertyOptional({
    type: PageActorEntity,
    nullable: true,
    description: 'Пользователь, удаливший документ (null, если аккаунт удалён)',
  })
  readonly deletedBy: PageActorEntity | null;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly createdAt: Date;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    workspaceId: string;
    projectId: string | null;
    title: string;
    icon: string | null;
    type: PageType;
    author: PageActorEntity;
    deletedAt: Date;
    deletedBy: PageActorEntity | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.workspaceId = props.workspaceId;
    this.projectId = props.projectId;
    this.title = props.title;
    this.icon = props.icon;
    this.type = props.type;
    this.author = props.author;
    this.deletedAt = props.deletedAt;
    this.deletedBy = props.deletedBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
