import { ApiProperty } from '@nestjs/swagger';

export type PageSearchPathItemType = 'project' | 'page';

export class PageSearchPathItemEntity {
  @ApiProperty({ enum: ['project', 'page'] })
  readonly type: PageSearchPathItemType;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  readonly id: string;

  @ApiProperty({ example: 'Дизайн-система' })
  readonly name: string;

  constructor(type: PageSearchPathItemType, id: string, name: string) {
    this.type = type;
    this.id = id;
    this.name = name;
  }
}
