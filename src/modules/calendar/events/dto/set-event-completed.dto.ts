import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetEventCompletedDto {
  @ApiProperty({
    example: true,
    description: 'true — отметить выполненным, false — снять отметку',
  })
  @IsBoolean()
  isCompleted!: boolean;
}
