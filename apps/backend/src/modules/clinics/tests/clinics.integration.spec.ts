import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { SubscriptionPlan, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { User } from '../../users/entities/user.entity'
import { Clinic } from '../entities/clinic.entity'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'

process.env.NODE_ENV = 'test'
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost'
process.env.DB_PORT = process.env.DB_PORT ?? '5499'
process.env.DB_USER = process.env.DB_USER ?? 'postgres'
process.env.DB_PASS = process.env.DB_PASS ?? 'postgres'
process.env.DB_NAME = process.env.DB_NAME ?? 'app'
process.env.DB_SCHEMA = 'test'
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost'
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6399'
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'

describe('ClinicsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let platformAdminToken: string
  let adminToken: string
  let doctorToken: string
  let userToken: string

  async function loginAs(role: UserRole): Promise<string> {
    const password = 'Password123!'
    const hashedPassword = await bcrypt.hash(password, 1)
    const user = await userRepository.save(
      userRepository.create({
        fullName: `Test ${role} User`,
        email: `${role}.${faker.string.alphanumeric(6)}@clinics.test`,
        password: hashedPassword,
        role,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password, slug: 'seed-clinic' })

    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const match = cookies.find((c: string) => c.startsWith('access_token_seed-clinic='))
    return match ? match.slice('access_token_seed-clinic='.length).split(';')[0] : ''
  }

  async function loginAsPlatformAdmin(): Promise<string> {
    const password = 'Password123!'
    const hashedPassword = await bcrypt.hash(password, 1)
    const user = await userRepository.save(
      userRepository.create({
        fullName: 'Platform Admin',
        email: `platform.${faker.string.alphanumeric(6)}@clinics.test`,
        password: hashedPassword,
        role: UserRole.PLATFORM_ADMIN,
        clinicId: null,
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password })

    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const match = cookies.find((c: string) => c.startsWith('access_token='))
    return match ? match.slice('access_token='.length).split(';')[0] : ''
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.listen(0)

    userRepository = module.get(getRepositoryToken(User))
    clinicRepository = module.get(getRepositoryToken(Clinic))
  })

  beforeEach(async () => {
    await clinicRepository.save(
      clinicRepository.create({ id: SEED_CLINIC_ID, name: 'Seed Clinic', slug: 'seed-clinic', isActive: true }),
    )

    platformAdminToken = await loginAsPlatformAdmin()
    adminToken = await loginAs(UserRole.ADMIN)
    doctorToken = await loginAs(UserRole.PROFESSIONAL)
    userToken = await loginAs(UserRole.USER)
  })

  afterEach(async () => {
    await clinicRepository.query('DELETE FROM test.schedules')
    await clinicRepository.query('DELETE FROM test.professional_specialties')
    await clinicRepository.query('DELETE FROM test.professionals')
    await clinicRepository.query('DELETE FROM test.patients')
    await clinicRepository.query('DELETE FROM test.specialties')
    await clinicRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
  })

  afterAll(async () => {
    await app.close()
  })

  function validAddress(overrides: object = {}) {
    return {
      street: 'Rua das Flores',
      number: '123',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      country: 'BR',
      ...overrides,
    }
  }

  function createClinic(token: string, payload: object) {
    return request(app.getHttpServer())
      .post('/clinics')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
  }

  function validCreatePayload(overrides: object = {}) {
    return {
      name: `Clinica ${faker.string.alphanumeric(6)}`,
      slug: `clinica-${faker.string.alphanumeric(6).toLowerCase()}`,
      address: validAddress(),
      ...overrides,
    }
  }

  describe('POST /clinics', () => {
    it('returns 201 with ClinicResponseDto including address on success', async () => {
      const address = validAddress()
      const { body } = await createClinic(platformAdminToken, {
        name: 'Clínica do Coração',
        slug: 'clinica-do-coracao',
        address,
      }).expect(201)

      expect(body.id).toBeDefined()
      expect(body.name).toBe('Clínica do Coração')
      expect(body.slug).toBe('clinica-do-coracao')
      expect(body.isActive).toBe(true)
      expect(body.address.street).toBe(address.street)
      expect(body.address.number).toBe(address.number)
      expect(body.address.neighborhood).toBe(address.neighborhood)
      expect(body.address.city).toBe(address.city)
      expect(body.address.state).toBe('SP')
      expect(body.address.zipCode).toBe(address.zipCode)
      expect(body.address.country).toBe('BR')
      expect(body.createdAt).toBeDefined()
      expect(body.updatedAt).toBeDefined()
    })

    it('defaults the plan to Free when not provided', async () => {
      const { body } = await createClinic(platformAdminToken, validCreatePayload()).expect(201)
      expect(body.plan).toBe(SubscriptionPlan.FREE)
    })

    it('stores the plan when provided', async () => {
      const { body } = await createClinic(
        platformAdminToken,
        validCreatePayload({ plan: SubscriptionPlan.CLINICA }),
      ).expect(201)
      expect(body.plan).toBe(SubscriptionPlan.CLINICA)
    })

    it('returns 400 for an invalid plan value', async () => {
      await createClinic(platformAdminToken, validCreatePayload({ plan: 'ouro' })).expect(400)
    })

    it('returns 400 when address is missing', async () => {
      await createClinic(platformAdminToken, { name: 'Clínica do Coração', slug: 'clinica-do-coracao' }).expect(400)
    })

    it('returns 400 when required address field is missing', async () => {
      const { street: _street, ...addressWithoutStreet } = validAddress()
      await createClinic(platformAdminToken, {
        name: 'Clínica do Coração',
        slug: 'clinica-do-coracao',
        address: addressWithoutStreet,
      }).expect(400)
    })

    it('returns 400 when zipCode format is invalid', async () => {
      await createClinic(platformAdminToken, {
        name: 'Clínica do Coração',
        slug: 'clinica-do-coracao',
        address: validAddress({ zipCode: '12345' }),
      }).expect(400)
    })

    it('returns 400 when zipCode has wrong format (no hyphen)', async () => {
      await createClinic(platformAdminToken, {
        name: 'Clínica do Coração',
        slug: 'clinica-do-coracao',
        address: validAddress({ zipCode: '123456789' }),
      }).expect(400)
    })

    it('returns 400 when state has more than 2 characters', async () => {
      await createClinic(platformAdminToken, {
        name: 'Clínica do Coração',
        slug: 'clinica-do-coracao',
        address: validAddress({ state: 'SPA' }),
      }).expect(400)
    })

    it('stores state in uppercase when sent in lowercase', async () => {
      const { body } = await createClinic(platformAdminToken, {
        name: 'Clínica do Coração',
        slug: 'clinica-do-coracao',
        address: validAddress({ state: 'sp' }),
      }).expect(201)

      expect(body.address.state).toBe('SP')
    })

    it('uses BR as default country when not provided', async () => {
      const { complement: _, country: __, ...addressWithoutCountry } = validAddress() as any
      const { body } = await createClinic(platformAdminToken, {
        name: 'Clínica do Coração',
        slug: 'clinica-do-coracao',
        address: addressWithoutCountry,
      }).expect(201)

      expect(body.address.country).toBe('BR')
    })

    it('accepts null complement', async () => {
      const { body } = await createClinic(platformAdminToken, validCreatePayload({
        address: validAddress({ complement: null }),
      })).expect(201)

      expect(body.address.complement).toBeNull()
    })

    it('generates slug from name when not provided', async () => {
      const { body } = await createClinic(platformAdminToken, {
        name: 'Minha Clinica',
        address: validAddress(),
      }).expect(201)

      expect(body.slug).toBe('minha-clinica')
    })

    it('persists manually provided slug as sent', async () => {
      const { body } = await createClinic(platformAdminToken, {
        name: 'Clínica do Coração',
        slug: 'clinica-do-coracao',
        address: validAddress(),
      }).expect(201)

      expect(body.slug).toBe('clinica-do-coracao')
    })

    it('response never contains version or deletedAt', async () => {
      const { body } = await createClinic(platformAdminToken, validCreatePayload()).expect(201)

      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 409 when slug is already in use', async () => {
      await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica A', slug: 'my-clinic' })).expect(201)
      await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica B', slug: 'my-clinic' })).expect(409)
    })

    it('returns 400 when slug has uppercase letters', async () => {
      await createClinic(platformAdminToken, validCreatePayload({ slug: 'My-Clinic' })).expect(400)
    })

    it('returns 400 when slug has spaces', async () => {
      await createClinic(platformAdminToken, validCreatePayload({ slug: 'my clinic' })).expect(400)
    })

    it('returns 400 when slug has special characters', async () => {
      await createClinic(platformAdminToken, validCreatePayload({ slug: 'my_clinic!' })).expect(400)
    })

    it('returns 400 when name is too short', async () => {
      await createClinic(platformAdminToken, validCreatePayload({ name: 'AB', slug: 'ab' })).expect(400)
    })

    it('returns 400 when unknown field is sent', async () => {
      await createClinic(platformAdminToken, { ...validCreatePayload(), unknownField: 'value' }).expect(400)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).post('/clinics').send(validCreatePayload()).expect(401)
    })

    it('returns 403 when ADMIN tries to create', async () => {
      await createClinic(adminToken, validCreatePayload()).expect(403)
    })

    it('returns 403 when DOCTOR tries to create', async () => {
      await createClinic(doctorToken, validCreatePayload()).expect(403)
    })

    it('returns 403 when USER tries to create', async () => {
      await createClinic(userToken, validCreatePayload()).expect(403)
    })
  })

  describe('GET /clinics', () => {
    it('returns 200 with paginated response including address', async () => {
      await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica A', slug: 'clinica-a' }))
      await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica B', slug: 'clinica-b' }))

      const { body } = await request(app.getHttpServer())
        .get('/clinics')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.data).toBeDefined()
      expect(body.total).toBeGreaterThanOrEqual(2)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
      expect(body.data[0].address).toBeDefined()
    })

    it('filters by name via search param', async () => {
      await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica do Coracao', slug: 'clinica-do-coracao' }))
      await createClinic(platformAdminToken, validCreatePayload({ name: 'Hospital Geral', slug: 'hospital-geral' }))

      const { body } = await request(app.getHttpServer())
        .get('/clinics?search=Coracao')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.data.some((c: any) => c.name === 'Clinica do Coracao')).toBe(true)
      expect(body.data.every((c: any) => c.name !== 'Hospital Geral')).toBe(true)
    })

    it('filters by slug via search param', async () => {
      await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica do Coracao', slug: 'clinica-do-coracao' }))
      await createClinic(platformAdminToken, validCreatePayload({ name: 'Hospital Geral', slug: 'hospital-geral' }))

      const { body } = await request(app.getHttpServer())
        .get('/clinics?search=hospital')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.data.some((c: any) => c.slug === 'hospital-geral')).toBe(true)
      expect(body.data.every((c: any) => c.slug !== 'clinica-do-coracao')).toBe(true)
    })

    it('response data never contains version or deletedAt', async () => {
      await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica Test', slug: 'clinica-test' }))

      const { body } = await request(app.getHttpServer())
        .get('/clinics')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      body.data.forEach((c: any) => {
        expect(c.version).toBeUndefined()
        expect(c.deletedAt).toBeUndefined()
      })
    })

    it('returns 400 when limit exceeds 100', async () => {
      await request(app.getHttpServer())
        .get('/clinics?limit=101')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(400)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).get('/clinics').expect(401)
    })

    it('returns 403 when ADMIN tries to list', async () => {
      await request(app.getHttpServer())
        .get('/clinics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
    })

    it('returns 403 when DOCTOR tries to list', async () => {
      await request(app.getHttpServer())
        .get('/clinics')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to list', async () => {
      await request(app.getHttpServer())
        .get('/clinics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })
  })

  describe('GET /clinics/:id', () => {
    it('returns 200 with ClinicResponseDto including address', async () => {
      const address = validAddress()
      const { body: created } = await createClinic(platformAdminToken, {
        name: 'Clinica Test',
        slug: 'clinica-test',
        address,
      }).expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.name).toBe('Clinica Test')
      expect(body.slug).toBe('clinica-test')
      expect(body.plan).toBe(SubscriptionPlan.FREE)
      expect(body.professionalCount).toBe(0)
      expect(body.address.street).toBe(address.street)
      expect(body.address.zipCode).toBe(address.zipCode)
      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 404 when clinic does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/clinics/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).get(`/clinics/${faker.string.uuid()}`).expect(401)
    })

    it('returns 403 when ADMIN tries to get by id', async () => {
      const { body: created } = await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica Test', slug: 'clinica-test' })).expect(201)

      await request(app.getHttpServer())
        .get(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
    })

    it('returns 403 when DOCTOR tries to get by id', async () => {
      const { body: created } = await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica Test', slug: 'clinica-test' })).expect(201)

      await request(app.getHttpServer())
        .get(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to get by id', async () => {
      const { body: created } = await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica Test', slug: 'clinica-test' })).expect(201)

      await request(app.getHttpServer())
        .get(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })
  })

  describe('PATCH /clinics/:id', () => {
    it('returns 200 with updated ClinicResponseDto', async () => {
      const { body: created } = await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica Antiga', slug: 'clinica-antiga' })).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Clinica Nova' })
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.name).toBe('Clinica Nova')
    })

    it('changes the plan when the clinic has no professionals over the new cap', async () => {
      const { body: created } = await createClinic(
        platformAdminToken,
        validCreatePayload({ plan: SubscriptionPlan.FREE }),
      ).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ plan: SubscriptionPlan.CLINICA })
        .expect(200)

      expect(body.plan).toBe(SubscriptionPlan.CLINICA)
    })

    it('updates only address when address is sent', async () => {
      const { body: created } = await createClinic(platformAdminToken, validCreatePayload()).expect(201)
      const newAddress = validAddress({ street: 'Av. Paulista', number: '1000', zipCode: '01310-200' })

      const { body } = await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ address: newAddress })
        .expect(200)

      expect(body.address.street).toBe('Av. Paulista')
      expect(body.address.number).toBe('1000')
      expect(body.address.zipCode).toBe('01310-200')
    })

    it('preserves existing address when address is not in patch body', async () => {
      const address = validAddress()
      const { body: created } = await createClinic(platformAdminToken, {
        name: 'Clinica Test',
        slug: 'clinica-test',
        address,
      }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Clinica Renomeada' })
        .expect(200)

      expect(body.address.street).toBe(address.street)
      expect(body.address.zipCode).toBe(address.zipCode)
    })

    it('returns 400 when address zipCode is invalid in patch', async () => {
      const { body: created } = await createClinic(platformAdminToken, validCreatePayload()).expect(201)

      await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ address: validAddress({ zipCode: 'invalid' }) })
        .expect(400)
    })

    it('deactivates clinic via isActive false', async () => {
      const { body: created } = await createClinic(platformAdminToken, validCreatePayload()).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ isActive: false })
        .expect(200)

      expect(body.isActive).toBe(false)
    })

    it('does not conflict when updating with the same slug', async () => {
      const { body: created } = await createClinic(platformAdminToken, validCreatePayload({ slug: 'clinica-test' })).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ slug: 'clinica-test' })
        .expect(200)

      expect(body.slug).toBe('clinica-test')
    })

    it('returns 409 when updating slug to one already used by another clinic', async () => {
      const { body: c1 } = await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica A', slug: 'clinica-a' })).expect(201)
      await createClinic(platformAdminToken, validCreatePayload({ name: 'Clinica B', slug: 'clinica-b' })).expect(201)

      await request(app.getHttpServer())
        .patch(`/clinics/${c1.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ slug: 'clinica-b' })
        .expect(409)
    })

    it('returns 404 when clinic does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/clinics/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Nova Clinica' })
        .expect(404)
    })

    it('response never contains version or deletedAt', async () => {
      const { body: created } = await createClinic(platformAdminToken, validCreatePayload()).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Clinica Nova' })
        .expect(200)

      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .patch(`/clinics/${faker.string.uuid()}`)
        .send({ name: 'X' })
        .expect(401)
    })

    it('returns 403 when ADMIN tries to update', async () => {
      const { body: created } = await createClinic(platformAdminToken, validCreatePayload()).expect(201)

      await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Nova Clinica' })
        .expect(403)
    })

    it('returns 403 when DOCTOR tries to update', async () => {
      const { body: created } = await createClinic(platformAdminToken, validCreatePayload()).expect(201)

      await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ name: 'Nova Clinica' })
        .expect(403)
    })

    it('returns 403 when USER tries to update', async () => {
      const { body: created } = await createClinic(platformAdminToken, validCreatePayload()).expect(201)

      await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Nova Clinica' })
        .expect(403)
    })
  })

  describe('GET /clinics/me', () => {
    it('returns 200 with the clinic data for authenticated ADMIN', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/clinics/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.id).toBe(SEED_CLINIC_ID)
      expect(body.name).toBe('Seed Clinic')
      expect(body.slug).toBe('seed-clinic')
      expect(body.isActive).toBe(true)
      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 200 with the clinic data for authenticated DOCTOR', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/clinics/me')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.id).toBe(SEED_CLINIC_ID)
    })

    it('returns 200 with the clinic data for authenticated USER', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/clinics/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(body.id).toBe(SEED_CLINIC_ID)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).get('/clinics/me').expect(401)
    })

    it('returns 403 when PLATFORM_ADMIN tries to access (no clinicId)', async () => {
      await request(app.getHttpServer())
        .get('/clinics/me')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(403)
    })
  })

  describe('clinic branding (private bucket, served by the backend)', () => {
    it('uploads a logo and returns a backend delivery URL (not a public S3 URL)', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/clinics/${SEED_CLINIC_ID}/logo`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .attach('logo', Buffer.from('fake-png-bytes'), { filename: 'logo.png', contentType: 'image/png' })
        .expect(201)

      expect(body.logoUrl).toContain('/clinics/seed-clinic/logo')
      expect(body.logoUrl).not.toContain('amazonaws.com')
    })

    it('streams the uploaded logo publicly (no auth) with an image content-type', async () => {
      await request(app.getHttpServer())
        .post(`/clinics/${SEED_CLINIC_ID}/logo`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .attach('logo', Buffer.from('fake-png-bytes'), { filename: 'logo.png', contentType: 'image/png' })
        .expect(201)

      const response = await request(app.getHttpServer())
        .get('/clinics/seed-clinic/logo')
        .expect(200)

      expect(response.headers['content-type']).toContain('image/png')
      expect(response.headers['cache-control']).toContain('max-age=300')
    })

    it('returns 404 when the requested asset was never uploaded', async () => {
      await request(app.getHttpServer()).get('/clinics/seed-clinic/favicon').expect(404)
    })

    it('returns 404 when the clinic slug does not exist', async () => {
      await request(app.getHttpServer()).get('/clinics/does-not-exist/logo').expect(404)
    })
  })
})
