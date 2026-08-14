import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface ProjectEntityData {
  id: string;
  workspaceId: string;
  parentProjectId: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  childProjects?: ProjectEntity[];
}

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

  constructor(data: ProjectEntityData) {
    this.id = data.id;
    this.workspaceId = data.workspaceId;
    this.parentProjectId = data.parentProjectId;
    this.name = data.name;
    this.color = data.color;
    this.icon = data.icon;
    this.position = data.position;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.childProjects = data.childProjects ?? [];
  }
}
