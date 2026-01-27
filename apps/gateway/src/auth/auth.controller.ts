import { Controller, Get, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAccessGuard } from './auth.guard';

type AccessTokenPayload = {
  sub: string;
  email: string;
};

@Controller('api')
export class AuthController {
  @UseGuards(JwtAccessGuard)
  @Get('me')
  getMe(@Req() req: Request & { user?: AccessTokenPayload }) {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('Invalid access token');
    }

    return { userId: user.sub, email: user.email };
  }
}
