import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AiAction } from '../ai-action';

export class CompleteAiDto {
  @ApiProperty({
    enum: AiAction,
    example: AiAction.SUMMARIZE,
    description: 'Действие генерации',
  })
  @IsEnum(AiAction)
  action!: AiAction;

  @ApiProperty({
    example: 'Кратко перескажи заметку о запуске',
    description: 'Текст документа или промпт',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  text!: string;
}
