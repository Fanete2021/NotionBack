import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import {
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
  ApiValidationErrorResponse,
} from '@common/decorators/swagger';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationSettingsEntity } from './entities';
import { UpdateNotificationSettingsDto } from './dto';

@ApiTags('Уведомления')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@ApiInternalServerErrorResponse()
@UseGuards(JwtAuthGuard)
@Controller('notifications/settings')
export class NotificationsController {
  constructor(private readonly settingsService: NotificationSettingsService) {}

  @ApiOperation({ summary: 'Получить настройки уведомлений' })
  @ApiResponse({ status: 200, type: NotificationSettingsEntity })
  @Get()
  getSettings(
    @CurrentUser('id') userId: string,
  ): Promise<NotificationSettingsEntity> {
    return this.settingsService.getSettings(userId);
  }

  @ApiOperation({ summary: 'Обновить настройки уведомлений' })
  @ApiBody({ type: UpdateNotificationSettingsDto })
  @ApiResponse({ status: 200, type: NotificationSettingsEntity })
  @ApiValidationErrorResponse()
  @Patch()
  updateSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsEntity> {
    return this.settingsService.updateSettings(userId, dto);
  }
}
