import { BadGatewayException, Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { getEnv } from '../config/env';
import { postRaw } from '../http/http.client';

@Controller('api/auth')
export class AuthProxyController {
  private readonly usersServiceUrl: string;

  constructor() {
    const env = getEnv();
    this.usersServiceUrl = env.USERS_SERVICE_URL.replace(/\/$/, '');
  }

  @Post('register')
  async register(@Body() body: Record<string, unknown>, @Res() res: Response) {
    return this.proxy(res, '/auth/register', body);
  }

  @Post('login')
  async login(@Body() body: Record<string, unknown>, @Res() res: Response) {
    return this.proxy(res, '/auth/login', body);
  }

  @Post('refresh')
  async refresh(@Body() body: Record<string, unknown>, @Res() res: Response) {
    return this.proxy(res, '/auth/refresh', body);
  }

  @Post('logout')
  async logout(@Body() body: Record<string, unknown>, @Res() res: Response) {
    return this.proxy(res, '/auth/logout', body);
  }

  private async proxy(
    res: Response,
    path: string,
    body: Record<string, unknown>,
  ) {
    try {
      const response = await postRaw<unknown, Record<string, unknown>>(
        `${this.usersServiceUrl}${path}`,
        body,
      );

      Object.entries(response.headers).forEach(([header, value]) => {
        res.setHeader(header, value);
      });

      res.status(response.status);

      if (response.body === undefined) {
        return res.send();
      }

      return res.send(response.body);
    } catch (error) {
      throw new BadGatewayException('Users service unavailable');
    }
  }
}
