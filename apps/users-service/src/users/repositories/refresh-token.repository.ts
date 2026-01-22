import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repository: Repository<RefreshTokenEntity>,
  ) {}

  createToken(userId: string, tokenHash: string, expiresAt: Date) {
    const token = this.repository.create({ userId, tokenHash, expiresAt });
    return this.repository.save(token);
  }

  revokeByUserAndHash(userId: string, tokenHash: string, revokedAt: Date) {
    return this.repository.update(
      { userId, tokenHash, revokedAt: IsNull() },
      { revokedAt },
    );
  }
}
