import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class UpdateEventDto {
  @ApiPropertyOptional({
    example: 'Встреча с командой продукта',
    description: 'Название события',
  })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Event title must not be empty' })
  title?: string;

  @ApiPropertyOptional({
    example: '2026-09-09T14:00:00.000Z',
    description: 'Дата и время начала (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({
    example: '2026-09-09T14:30:00.000Z',
    description: 'Дата и время окончания (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ example: false, description: 'Событие на весь день' })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID проекта (null — открепить от проекта)',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  projectId?: string | null;
}
