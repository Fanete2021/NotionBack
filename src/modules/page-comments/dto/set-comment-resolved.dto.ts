import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetCommentResolvedDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  resolved!: boolean;
}
