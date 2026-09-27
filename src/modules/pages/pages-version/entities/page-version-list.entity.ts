import { ApiProperty } from '@nestjs/swagger';
import { PageVersionEntity } from './page-version.entity';

export class PageVersionListEntity {
  @ApiProperty({ type: () => [PageVersionEntity] })
  readonly items: PageVersionEntity[];

  @ApiProperty({
    nullable: true,
    type: String,
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Курсор следующей страницы, null если страница последняя',
  })
  readonly nextCursor: string | null;

  constructor(items: PageVersionEntity[], nextCursor: string | null) {
    this.items = items;
    this.nextCursor = nextCursor;
  }
}
