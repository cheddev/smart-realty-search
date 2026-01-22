import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  findByEmail(email: string) {
    return this.repository.findOne({ where: { email } });
  }

  createUser(email: string, passwordHash: string) {
    const user = this.repository.create({ email, passwordHash });
    return this.repository.save(user);
  }
}
