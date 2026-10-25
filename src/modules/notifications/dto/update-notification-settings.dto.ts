import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

const TIME_REGEX = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
const TIME_MESSAGE = 'Время должно быть в формате ЧЧ:ММ (например, 23:00)';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ example: true, description: 'Напоминания о событиях' })
  @IsOptional()
  @IsBoolean()
  eventReminders?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Ежедневная сводка' })
  @IsOptional()
  @IsBoolean()
  dailySummary?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Обновления задач' })
  @IsOptional()
  @IsBoolean()
  taskUpdates?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Конфликты расписания' })
  @IsOptional()
  @IsBoolean()
  scheduleConflicts?: boolean;

  @ApiPropertyOptional({
    example: 15,
    description: 'Время напоминания по умолчанию (минут до события)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(40320)
  reminderMinutes?: number;

  @ApiPropertyOptional({ example: false, description: 'Режим тишины' })
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @ApiPropertyOptional({
    example: '23:00',
    description: 'Начало режима тишины (HH:mm)',
  })
  @IsOptional()
  @Matches(TIME_REGEX, { message: TIME_MESSAGE })
  quietHoursStart?: string;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Конец режима тишины (HH:mm)',
  })
  @IsOptional()
  @Matches(TIME_REGEX, { message: TIME_MESSAGE })
  quietHoursEnd?: string;
}
