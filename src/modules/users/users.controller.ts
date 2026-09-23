import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto';
import { UserEntity } from './user.entity';
import {
  UsersControllerResponse,
  UsersUpdateProfileResponse,
} from './decorators';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';

@UsersControllerResponse()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UsersUpdateProfileResponse()
  @Patch('me')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserEntity> {
    return this.usersService.updateProfile(userId, dto);
  }
}
