import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '@common/decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
  constructor(
    private readonly reflector: Reflector,
    @InjectPinoLogger(JwtAuthGuard.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    if (err || !user) {
      this.logger.warn(
        {
          guard: 'jwt-access',
          reason: info instanceof Error ? info.message : 'invalid_token',
        },
        'access denied',
      );
      throw new UnauthorizedException('Invalid or missing token');
    }
    return user;
  }
}
