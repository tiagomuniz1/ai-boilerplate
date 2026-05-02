import { HealthController } from './health.controller'
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus'

describe('HealthController', () => {
  let controller: HealthController
  let healthCheckService: jest.Mocked<HealthCheckService>
  let typeOrmHealthIndicator: jest.Mocked<TypeOrmHealthIndicator>

  beforeEach(() => {
    typeOrmHealthIndicator = {
      pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
    } as unknown as jest.Mocked<TypeOrmHealthIndicator>

    healthCheckService = {
      check: jest.fn().mockImplementation((fns: (() => any)[]) =>
        Promise.all(fns.map((fn) => fn())),
      ),
    } as unknown as jest.Mocked<HealthCheckService>

    controller = new HealthController(healthCheckService, typeOrmHealthIndicator)
  })

  it('calls health.check with database ping', async () => {
    await controller.check()

    expect(healthCheckService.check).toHaveBeenCalled()
    expect(typeOrmHealthIndicator.pingCheck).toHaveBeenCalledWith('database')
  })
})
