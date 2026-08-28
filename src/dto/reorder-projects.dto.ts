import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class ReorderProjectsDto {
  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID родительского проекта (null — корневой уровень)',
  })
  @IsOptional()
  @IsUUID('4')
  parentProjectId?: string | null;

  @ApiProperty({
    example: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
    description: 'Упорядоченные id всех соседних проектов под указанным родителем',
  })
  @ArrayNotEmpty({ message: 'orderedIds must not be empty' })
  @ArrayUnique({ message: 'orderedIds must not contain duplicates' })
  @IsUUID('4', { each: true, message: 'orderedIds must contain only UUIDs' })
  orderedIds!: string[];
}
