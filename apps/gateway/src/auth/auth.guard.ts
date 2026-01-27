import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { getEnv } from '../config/env';

type AccessTokenPayload = {
  sub?: string;
  email?: string;
};

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AccessTokenPayload }>();
    const token = this.extractToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    const env = getEnv();
    const options: Parameters<JwtService['verifyAsync']>[1] = {
      secret: env.JWT_ACCESS_SECRET,
    };

    if (env.JWT_ISSUER) {
      options.issuer = env.JWT_ISSUER;
    }

    if (env.JWT_AUDIENCE) {
      options.audience = env.JWT_AUDIENCE;
    }

    try {
      const payload = (await this.jwtService.verifyAsync(
        token,
        options,
      )) as AccessTokenPayload;

      if (!payload?.sub || !payload?.email) {
        throw new UnauthorizedException('Invalid access token');
      }

      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractToken(authorization?: string) {
    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
