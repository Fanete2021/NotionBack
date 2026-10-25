import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationSettingsEntity {
  @ApiProperty({ example: true, description: 'Напоминания о событиях' })
  readonly eventReminders: boolean;

  @ApiProperty({ example: false, description: 'Ежедневная сводка в 08:00' })
  readonly dailySummary: boolean;

  @ApiProperty({
    example: false,
    description: 'Уведомления об изменении статуса задач',
  })
  readonly taskUpdates: boolean;

  @ApiProperty({
    example: false,
    description: 'Уведомления о конфликтах расписания',
  })
  readonly scheduleConflicts: boolean;

  @ApiProperty({
    example: 15,
    description: 'Время напоминания по умолчанию (минут до события)',
  })
  readonly reminderMinutes: number;

  @ApiProperty({ example: false, description: 'Включён ли режим тишины' })
  readonly quietHoursEnabled: boolean;

  @ApiPropertyOptional({
    example: '23:00',
    nullable: true,
    description: 'Начало режима тишины (HH:mm)',
  })
  readonly quietHoursStart: string | null;

  @ApiPropertyOptional({
    example: '08:00',
    nullable: true,
    description: 'Конец режима тишины (HH:mm)',
  })
  readonly quietHoursEnd: string | null;

  constructor(props: {
    eventReminders: boolean;
    dailySummary: boolean;
    taskUpdates: boolean;
    scheduleConflicts: boolean;
    reminderMinutes: number;
    quietHoursEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
  }) {
    this.eventReminders = props.eventReminders;
    this.dailySummary = props.dailySummary;
    this.taskUpdates = props.taskUpdates;
    this.scheduleConflicts = props.scheduleConflicts;
    this.reminderMinutes = props.reminderMinutes;
    this.quietHoursEnabled = props.quietHoursEnabled;
    this.quietHoursStart = props.quietHoursStart;
    this.quietHoursEnd = props.quietHoursEnd;
  }
}
