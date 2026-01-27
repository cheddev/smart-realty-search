import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { getEnv } from '../config/env';
import { AuthController } from './auth.controller';
import { JwtAccessGuard } from './auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const env = getEnv();

        return {
          secret: env.JWT_ACCESS_SECRET,
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [JwtAccessGuard],
})
export class AuthModule {}
