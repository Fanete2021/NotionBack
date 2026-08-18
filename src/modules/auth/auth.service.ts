import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { TokenData, RefreshData, RevokeData } from './types/token.types';
import { TokenService } from './token.service';
import { LoginData, LogoutData, RegisterData } from './types/auth.types';
import { CreateUserData } from '../users/types/users.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  private async generateTokens(data: TokenData) {
    return this.tokenService.generateTokens(data);
  }

  async register(data: RegisterData) {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10);
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const createUserData: CreateUserData = {
      email: data.email,
      name: data.name,
      avatarUrl: data.avatarUrl,
      passwordHash,
    };
    const user = await this.usersService.createUser(createUserData);

    const tokenData: TokenData = { userId: user.id, email: user.email };
    return this.generateTokens(tokenData);
  }

  async login(data: LoginData) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokenData: TokenData = { userId: user.id, email: user.email };
    return this.generateTokens(tokenData);
  }

  async refresh(data: RefreshData) {
    try {
      const refreshSession = await this.tokenService.validateRefreshToken(
        data.token,
      );
      const user = await this.usersService.findById(refreshSession.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokenData: TokenData = { userId: user.id, email: user.email };
      return this.generateTokens(tokenData);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(data: LogoutData) {
    if (data.token) {
      const tokenUserId = this.tokenService.getTokenUserId(data.token);
      if (tokenUserId !== data.userId) {
        throw new UnauthorizedException('Invalid refresh token');
      }
    }

    const revokeData: RevokeData = {
      userId: data.userId,
      token: data.token,
    };
    await this.tokenService.revokeToken(revokeData);
    return { message: 'Logged out successfully' };
  }
}
