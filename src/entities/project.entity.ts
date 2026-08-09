import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectEntity {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly workspaceId: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly parentProjectId: string | null;

  @ApiProperty({ example: 'Work' })
  readonly name: string;

  @ApiPropertyOptional({ example: '#ff6347' })
  readonly color: string | null;

  @ApiPropertyOptional({ example: '📁' })
  readonly icon: string | null;

  @ApiProperty({ example: 0 })
  readonly position: number;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly createdAt: Date;

  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' })
  readonly updatedAt: Date;

  @ApiPropertyOptional({ type: () => [ProjectEntity] })
  childProjects: ProjectEntity[];

  constructor(
    id: string,
    workspaceId: string,
    parentProjectId: string | null,
    name: string,
    color: string | null,
    icon: string | null,
    position: number,
    createdAt: Date,
    updatedAt: Date,
    childProjects: ProjectEntity[] = [],
  ) {
    this.id = id;
    this.workspaceId = workspaceId;
    this.parentProjectId = parentProjectId;
    this.name = name;
    this.color = color;
    this.icon = icon;
    this.position = position;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.childProjects = childProjects;
  }
}
