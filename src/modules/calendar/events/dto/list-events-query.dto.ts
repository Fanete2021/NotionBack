import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ListEventsQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-01T00:00:00.000Z',
    description:
      'Начало диапазона — возвращаются события, пересекающие [from, to]',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-30T23:59:59.999Z',
    description:
      'Конец диапазона — возвращаются события, пересекающие [from, to]',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Фильтр по проекту',
  })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;
}
