import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import * as request from 'supertest'
import { AppModule } from '../../../app.module'

process.env.NODE_ENV = 'test'
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost'
process.env.DB_PORT = process.env.DB_PORT ?? '5499'
process.env.DB_USER = process.env.DB_USER ?? 'postgres'
process.env.DB_PASS = process.env.DB_PASS ?? 'postgres'
process.env.DB_NAME = process.env.DB_NAME ?? 'app'
process.env.DB_SCHEMA = 'test'
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost'
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6399'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'

describe('AccessRequestsController (integration)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  function payload(overrides: Record<string, unknown> = {}) {
    return {
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      clinicName: faker.company.name(),
      ...overrides,
    }
  }

  it('POST /access-requests → 202 with no authentication required', async () => {
    await request(app.getHttpServer()).post('/access-requests').send(payload()).expect(202)
  })

  it('POST /access-requests → 202 when phone is provided', async () => {
    await request(app.getHttpServer())
      .post('/access-requests')
      .send(payload({ phone: '11999998888' }))
      .expect(202)
  })

  it('POST /access-requests → 400 when email is invalid', async () => {
    await request(app.getHttpServer())
      .post('/access-requests')
      .send(payload({ email: 'not-an-email' }))
      .expect(400)
  })

  it('POST /access-requests → 400 when fullName is missing', async () => {
    const { fullName, ...rest } = payload()
    await request(app.getHttpServer()).post('/access-requests').send(rest).expect(400)
  })

  it('POST /access-requests → 400 when clinicName is missing', async () => {
    const { clinicName, ...rest } = payload()
    await request(app.getHttpServer()).post('/access-requests').send(rest).expect(400)
  })

  it('POST /access-requests → 400 when unknown field is sent', async () => {
    await request(app.getHttpServer())
      .post('/access-requests')
      .send(payload({ role: 'admin' }))
      .expect(400)
  })
})
