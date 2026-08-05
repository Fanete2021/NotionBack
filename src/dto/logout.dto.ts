import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LogoutDto {
  @ApiPropertyOptional({
    description:
      'Если true, завершает все сессии пользователя на всех устройствах. По умолчанию false (только текущее устройство).',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  allDevices?: boolean;
}
