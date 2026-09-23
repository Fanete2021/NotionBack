import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsUUID } from 'class-validator';

export class ReorderPagesDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Id проекта, документы которого переупорядочиваются',
  })
  @IsUUID('4', { message: 'Id проекта должен быть валидным UUID' })
  projectId!: string;

  @ApiProperty({
    example: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
    description: 'Упорядоченные id всех документов-соседей в проекте',
  })
  @ArrayNotEmpty({ message: 'orderedIds не должен быть пустым' })
  @ArrayUnique({ message: 'orderedIds не должен содержать дубликаты' })
  @IsUUID('4', {
    each: true,
    message: 'orderedIds должен содержать только UUID',
  })
  orderedIds!: string[];
}
