import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { AppModule } from '../../../app.module'
import { AccessRequest } from '../entities/access-request.entity'

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
  let accessRequestRepository: Repository<AccessRequest>

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    await app.init()

    accessRequestRepository = module.get(getRepositoryToken(AccessRequest))
  })

  afterEach(async () => {
    await accessRequestRepository.query('DELETE FROM test.access_requests')
  })

  afterAll(async () => {
    await app.close()
  })

  function payload(overrides: Record<string, unknown> = {}) {
    return {
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      clinicName: faker.company.name(),
      phone: undefined as string | undefined,
      ...overrides,
    }
  }

  it('POST /access-requests → 201 with no authentication required', async () => {
    await request(app.getHttpServer()).post('/access-requests').send(payload()).expect(201)
  })

  it('POST /access-requests → persists the request', async () => {
    const body = payload({ phone: '11999998888' })

    await request(app.getHttpServer()).post('/access-requests').send(body).expect(201)

    const saved = await accessRequestRepository.findOneBy({ email: body.email })
    expect(saved).not.toBeNull()
    expect(saved!.fullName).toBe(body.fullName)
    expect(saved!.clinicName).toBe(body.clinicName)
    expect(saved!.phone).toBe(body.phone)
  })

  it('POST /access-requests → persists with phone null when not provided', async () => {
    const body = payload()

    await request(app.getHttpServer()).post('/access-requests').send(body).expect(201)

    const saved = await accessRequestRepository.findOneBy({ email: body.email })
    expect(saved!.phone).toBeNull()
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
