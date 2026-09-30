import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    example: 'Встреча с командой продукта',
    description: 'Название события',
  })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Event title is required' })
  title!: string;

  @ApiProperty({
    example: '2026-09-09T14:00:00.000Z',
    description: 'Дата и время начала (ISO 8601)',
  })
  @IsDateString()
  startAt!: string;

  @ApiProperty({
    example: '2026-09-09T14:30:00.000Z',
    description: 'Дата и время окончания (ISO 8601)',
  })
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Событие на весь день',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID проекта, к которому относится событие',
  })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;
}
