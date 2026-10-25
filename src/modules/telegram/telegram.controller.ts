import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import {
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
} from '@common/decorators/swagger';
import { TelegramService } from './telegram.service';
import { ConnectCodeEntity, TelegramStatusEntity } from './entities';

@ApiTags('Telegram')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@ApiInternalServerErrorResponse()
@UseGuards(JwtAuthGuard)
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @ApiOperation({ summary: 'Сгенерировать код/ссылку для привязки Telegram' })
  @ApiResponse({ status: 201, type: ConnectCodeEntity })
  @Post('connect-code')
  createConnectCode(
    @CurrentUser('id') userId: string,
  ): Promise<ConnectCodeEntity> {
    return this.telegramService.createConnectCode(userId);
  }

  @ApiOperation({ summary: 'Статус привязки Telegram у текущего пользователя' })
  @ApiResponse({ status: 200, type: TelegramStatusEntity })
  @Get('status')
  getStatus(@CurrentUser('id') userId: string): Promise<TelegramStatusEntity> {
    return this.telegramService.getStatus(userId);
  }

  @ApiOperation({ summary: 'Отвязать Telegram-аккаунт' })
  @ApiResponse({ status: 204, description: 'Аккаунт отвязан' })
  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnect(@CurrentUser('id') userId: string): Promise<void> {
    return this.telegramService.disconnect(userId);
  }
}
