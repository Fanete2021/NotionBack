import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsOptional,
  IsString,
} from 'class-validator';

export class ReorderProjectsDto {
  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Parent project id (null for root level)',
  })
  @IsOptional()
  @IsString()
  parentProjectId?: string | null;

  @ApiProperty({
    example: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
    description: 'Ordered ids of all sibling projects under the given parent',
  })
  @ArrayNotEmpty({ message: 'orderedIds must not be empty' })
  @ArrayUnique({ message: 'orderedIds must not contain duplicates' })
  @IsString({ each: true, message: 'orderedIds must contain only strings' })
  orderedIds!: string[];
}
