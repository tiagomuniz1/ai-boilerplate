import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { DatabaseModule } from './database/database.module'
import { CacheModule } from './cache/cache.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './modules/auth/auth.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor'
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard'

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 300 },
    ]),
    DatabaseModule,
    CacheModule,
    HealthModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
