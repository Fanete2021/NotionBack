import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';
import { TokenData, RefreshData } from 'src/types/auth/token.types';
import { TokenService } from './token.service';
import {
  CreateUserData,
  LoginData,
  LogoutData,
  RegisterData,
} from 'src/types/auth/auth.types';

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

    const createUserData: CreateUserData = { ...data, passwordHash };
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

    await this.tokenService.revokeToken(data.userId, data.token);
    return { message: 'Logged out successfully' };
  }
}
