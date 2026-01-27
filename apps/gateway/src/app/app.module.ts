import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { AuthProxyModule } from '../auth-proxy/auth-proxy.module';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [AuthProxyModule, AuthModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
