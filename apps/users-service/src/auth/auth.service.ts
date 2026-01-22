import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { UserRepository } from '../users/repositories/user.repository';
import { getEnv } from '../config/env';
import { RefreshTokenRepository } from '../users/repositories/refresh-token.repository';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;
  private readonly env = getEnv();

  constructor(
    private readonly usersRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const saved = await this.usersRepository.createUser(
      dto.email,
      passwordHash,
    );

    return this.createTokens(saved.id, saved.email);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createTokens(user.id, user.email);
  }

  async logout(dto: LogoutDto) {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      type?: string;
    }>(dto.refreshToken, {
      secret: this.env.JWT_REFRESH_SECRET,
    });

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashRefreshToken(dto.refreshToken);
    await this.refreshTokenRepository.revokeByUserAndHash(
      payload.sub,
      tokenHash,
      new Date(),
    );
  }

  private async createTokens(userId: string, email: string) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.env.JWT_ACCESS_SECRET,
        expiresIn: this.env.JWT_ACCESS_TTL,
      },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
      {
        secret: this.env.JWT_REFRESH_SECRET,
        expiresIn: this.env.JWT_REFRESH_TTL,
      },
    );

    const expiresAt = new Date(
      Date.now() + this.getTtlMs(this.env.JWT_REFRESH_TTL),
    );
    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.refreshTokenRepository.createToken(
      userId,
      tokenHash,
      expiresAt,
    );

    return { accessToken, refreshToken };
  }

  private hashRefreshToken(token: string) {
    return createHash('sha256')
      .update(`${token}:${this.env.REFRESH_TOKEN_SALT}`)
      .digest('hex');
  }

  private getTtlMs(value: number | StringValue) {
    if (typeof value === 'number') {
      return value * 1000;
    }

    const match = /^(\d+)(ms|s|m|h|d)$/.exec(value);
    if (!match) {
      return 0;
    }

    const amount = Number(match[1]);
    const unit = match[2] as 'ms' | 's' | 'm' | 'h' | 'd';
    const multipliers = {
      ms: 1,
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    } as const;

    return amount * multipliers[unit];
  }
}
