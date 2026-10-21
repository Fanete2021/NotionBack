import { ApiProperty } from '@nestjs/swagger';
import { AiAction } from '../ai-action';

export class AiCompleteEntity {
  @ApiProperty({ enum: AiAction, example: AiAction.SUMMARIZE })
  readonly action: AiAction;

  @ApiProperty({ example: 'done', description: 'Статус генерации' })
  readonly status: 'done';

  @ApiProperty({ example: 'Краткий пересказ текста' })
  readonly text: string;

  constructor(action: AiAction, text: string) {
    this.action = action;
    this.status = 'done';
    this.text = text;
  }
}
