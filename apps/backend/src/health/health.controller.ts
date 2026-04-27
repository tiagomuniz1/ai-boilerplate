import { Controller, Get } from '@nestjs/common'
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus'
import { Public } from '../modules/auth/decorators/public.decorator'

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @Public()
  check() {
    return this.health.check([
      () => this.database.pingCheck('database'),
    ])
  }
}
