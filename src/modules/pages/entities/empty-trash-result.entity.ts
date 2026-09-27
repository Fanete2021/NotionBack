import { ApiProperty } from '@nestjs/swagger';

export class EmptyTrashResultEntity {
  @ApiProperty({
    example: 5,
    description: 'Сколько документов было удалено из корзины навсегда',
  })
  readonly deleted: number;

  constructor(deleted: number) {
    this.deleted = deleted;
  }
}
