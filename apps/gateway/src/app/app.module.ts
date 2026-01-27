import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { AuthProxyModule } from '../auth-proxy/auth-proxy.module';


@Module({
  imports: [AuthProxyModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
