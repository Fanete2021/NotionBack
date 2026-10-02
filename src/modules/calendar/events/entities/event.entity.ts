import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly workspaceId: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly projectId: string | null;

  @ApiProperty({ example: 'Встреча с командой продукта' })
  readonly title: string;

  @ApiProperty({ example: '2026-09-09T14:00:00.000Z' })
  readonly startAt: Date;

  @ApiProperty({ example: '2026-09-09T14:30:00.000Z' })
  readonly endAt: Date;

  @ApiProperty({ example: false })
  readonly allDay: boolean;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  readonly createdAt: Date;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    workspaceId: string;
    projectId: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
    allDay: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.workspaceId = props.workspaceId;
    this.projectId = props.projectId;
    this.title = props.title;
    this.startAt = props.startAt;
    this.endAt = props.endAt;
    this.allDay = props.allDay;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
