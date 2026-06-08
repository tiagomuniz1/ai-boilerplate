import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { User } from '../../users/entities/user.entity'
import { Clinic } from '../entities/clinic.entity'

const SEED_CLINIC_ID = '10000000-0000-0000-0000-000000000000'

process.env.NODE_ENV = 'test'
process.env.DB_SCHEMA = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'

describe('ClinicsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
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

    adminToken = await loginAs(UserRole.ADMIN)
    doctorToken = await loginAs(UserRole.DOCTOR)
    userToken = await loginAs(UserRole.USER)
  })

  afterEach(async () => {
    await clinicRepository.query('DELETE FROM test.schedules')
    await clinicRepository.query('DELETE FROM test.doctor_specialties')
    await clinicRepository.query('DELETE FROM test.doctors')
    await clinicRepository.query('DELETE FROM test.patients')
    await clinicRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
  })

  afterAll(async () => {
    await app.close()
  })

  function registerClinic(payload: object) {
    return request(app.getHttpServer()).post('/clinics/register').send(payload)
  }

  function createClinic(token: string, payload: object) {
    return request(app.getHttpServer())
      .post('/clinics')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
  }

  describe('POST /clinics/register', () => {
    function validPayload(overrides = {}) {
      return {
        clinicName: `Clinica ${faker.string.alphanumeric(6)}`,
        slug: `clinica-${faker.string.alphanumeric(6).toLowerCase()}`,
        adminFullName: faker.person.fullName(),
        adminEmail: faker.internet.email(),
        adminPassword: 'Password123!',
        ...overrides,
      }
    }

    it('returns 201 with clinic and admin data on success', async () => {
      const payload = validPayload()

      const { body } = await registerClinic(payload).expect(201)

      expect(body.clinic.id).toBeDefined()
      expect(body.clinic.name).toBe(payload.clinicName)
      expect(body.clinic.slug).toBe(payload.slug)
      expect(body.admin.id).toBeDefined()
      expect(body.admin.fullName).toBe(payload.adminFullName)
      expect(body.admin.email).toBe(payload.adminEmail)
    })

    it('response never contains password', async () => {
      const { body } = await registerClinic(validPayload()).expect(201)

      expect(body.admin.password).toBeUndefined()
    })

    it('generates slug from clinicName when not provided', async () => {
      const payload = validPayload({ clinicName: 'Minha Clinica Nova', slug: undefined })

      const { body } = await registerClinic(payload).expect(201)

      expect(body.clinic.slug).toBe('minha-clinica-nova')
    })

    it('admin is created with role ADMIN and isActive true', async () => {
      const payload = validPayload()
      await registerClinic(payload).expect(201)

      const createdUser = await userRepository.findOneBy({ email: payload.adminEmail })
      expect(createdUser?.role).toBe(UserRole.ADMIN)
      expect(createdUser?.isActive).toBe(true)
    })

    it('admin can login immediately after registration', async () => {
      const payload = validPayload()
      await registerClinic(payload).expect(201)

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: payload.adminEmail, password: payload.adminPassword })

      expect(loginResponse.status).toBe(200)
      expect(loginResponse.headers['set-cookie']).toBeDefined()
    })

    it('admin clinicId matches created clinic', async () => {
      const payload = validPayload()
      const { body } = await registerClinic(payload).expect(201)

      const createdUser = await userRepository.findOneBy({ email: payload.adminEmail })
      expect(createdUser?.clinicId).toBe(body.clinic.id)
    })

    it('returns 409 when slug is already in use', async () => {
      const slug = `clinica-${faker.string.alphanumeric(8).toLowerCase()}`
      await registerClinic(validPayload({ slug })).expect(201)

      await registerClinic(
        validPayload({ clinicName: 'Outra Clinica', slug }),
      ).expect(409)
    })

    it('returns 409 when email is already registered', async () => {
      const adminEmail = faker.internet.email()
      await registerClinic(validPayload({ adminEmail })).expect(201)

      await registerClinic(
        validPayload({ clinicName: 'Outra Clinica', adminEmail }),
      ).expect(409)
    })

    it('returns 400 when adminPassword is too short', async () => {
      await registerClinic(validPayload({ adminPassword: 'short' })).expect(400)
    })

    it('returns 400 when slug has invalid format', async () => {
      await registerClinic(validPayload({ slug: 'My Clinic!' })).expect(400)
    })

    it('returns 400 when clinicName is too short', async () => {
      await registerClinic(validPayload({ clinicName: 'AB' })).expect(400)
    })

    it('returns 400 when adminEmail is invalid', async () => {
      await registerClinic(validPayload({ adminEmail: 'not-an-email' })).expect(400)
    })

    it('returns 400 when unknown field is sent', async () => {
      await registerClinic({ ...validPayload(), unknownField: 'value' }).expect(400)
    })

    it('is accessible without authentication token', async () => {
      await registerClinic(validPayload()).expect(201)
    })

    it('rolls back clinic when user creation fails (atomic transaction)', async () => {
      const adminEmail = faker.internet.email()
      const slug = `clinica-${faker.string.alphanumeric(8).toLowerCase()}`

      await registerClinic(validPayload({ adminEmail })).expect(201)

      const clinicCountBefore = await clinicRepository.count()

      await registerClinic(
        validPayload({ slug: `${slug}-2`, adminEmail }),
      ).expect(409)

      const clinicCountAfter = await clinicRepository.count()
      expect(clinicCountAfter).toBe(clinicCountBefore)
    })
  })

  describe('POST /clinics', () => {
    it('returns 201 with ClinicResponseDto on success', async () => {
      const { body } = await createClinic(adminToken, { name: 'Clínica do Coração', slug: 'clinica-do-coracao' }).expect(201)

      expect(body.id).toBeDefined()
      expect(body.name).toBe('Clínica do Coração')
      expect(body.slug).toBe('clinica-do-coracao')
      expect(body.isActive).toBe(true)
      expect(body.createdAt).toBeDefined()
      expect(body.updatedAt).toBeDefined()
    })

    it('generates slug from name when not provided', async () => {
      const { body } = await createClinic(adminToken, { name: 'Minha Clinica' }).expect(201)

      expect(body.slug).toBe('minha-clinica')
    })

    it('persists manually provided slug as sent', async () => {
      const { body } = await createClinic(adminToken, {
        name: 'Clínica do Coração',
        slug: 'clinica-do-coracao',
      }).expect(201)

      expect(body.slug).toBe('clinica-do-coracao')
    })

    it('response never contains version or deletedAt', async () => {
      const { body } = await createClinic(adminToken, { name: 'Test Clinic', slug: 'test-clinic' }).expect(201)

      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 409 when slug is already in use', async () => {
      await createClinic(adminToken, { name: 'Clinica A', slug: 'my-clinic' }).expect(201)
      await createClinic(adminToken, { name: 'Clinica B', slug: 'my-clinic' }).expect(409)
    })

    it('returns 400 when slug has uppercase letters', async () => {
      await createClinic(adminToken, { name: 'Test', slug: 'My-Clinic' }).expect(400)
    })

    it('returns 400 when slug has spaces', async () => {
      await createClinic(adminToken, { name: 'Test', slug: 'my clinic' }).expect(400)
    })

    it('returns 400 when slug has special characters', async () => {
      await createClinic(adminToken, { name: 'Test', slug: 'my_clinic!' }).expect(400)
    })

    it('returns 400 when name is too short', async () => {
      await createClinic(adminToken, { name: 'AB', slug: 'ab' }).expect(400)
    })

    it('returns 400 when unknown field is sent', async () => {
      await createClinic(adminToken, { name: 'Clinica Test', slug: 'clinica-test', unknownField: 'value' }).expect(400)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).post('/clinics').send({ name: 'Test', slug: 'test' }).expect(401)
    })

    it('returns 403 when DOCTOR tries to create', async () => {
      await createClinic(doctorToken, { name: 'Test', slug: 'test' }).expect(403)
    })

    it('returns 403 when USER tries to create', async () => {
      await createClinic(userToken, { name: 'Test', slug: 'test' }).expect(403)
    })
  })

  describe('GET /clinics', () => {
    it('returns 200 with paginated response', async () => {
      await createClinic(adminToken, { name: 'Clinica A', slug: 'clinica-a' })
      await createClinic(adminToken, { name: 'Clinica B', slug: 'clinica-b' })

      const { body } = await request(app.getHttpServer())
        .get('/clinics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.data).toBeDefined()
      expect(body.total).toBeGreaterThanOrEqual(2)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
    })

    it('filters by name via search param', async () => {
      await createClinic(adminToken, { name: 'Clinica do Coracao', slug: 'clinica-do-coracao' })
      await createClinic(adminToken, { name: 'Hospital Geral', slug: 'hospital-geral' })

      const { body } = await request(app.getHttpServer())
        .get('/clinics?search=Coracao')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.data.some((c: any) => c.name === 'Clinica do Coracao')).toBe(true)
      expect(body.data.every((c: any) => c.name !== 'Hospital Geral')).toBe(true)
    })

    it('filters by slug via search param', async () => {
      await createClinic(adminToken, { name: 'Clinica do Coracao', slug: 'clinica-do-coracao' })
      await createClinic(adminToken, { name: 'Hospital Geral', slug: 'hospital-geral' })

      const { body } = await request(app.getHttpServer())
        .get('/clinics?search=hospital')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.data.some((c: any) => c.slug === 'hospital-geral')).toBe(true)
      expect(body.data.every((c: any) => c.slug !== 'clinica-do-coracao')).toBe(true)
    })

    it('response data never contains version or deletedAt', async () => {
      await createClinic(adminToken, { name: 'Clinica Test', slug: 'clinica-test' })

      const { body } = await request(app.getHttpServer())
        .get('/clinics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      body.data.forEach((c: any) => {
        expect(c.version).toBeUndefined()
        expect(c.deletedAt).toBeUndefined()
      })
    })

    it('returns 400 when limit exceeds 100', async () => {
      await request(app.getHttpServer())
        .get('/clinics?limit=101')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).get('/clinics').expect(401)
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
    it('returns 200 with ClinicResponseDto', async () => {
      const { body: created } = await createClinic(adminToken, { name: 'Clinica Test', slug: 'clinica-test' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.name).toBe('Clinica Test')
      expect(body.slug).toBe('clinica-test')
      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 404 when clinic does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/clinics/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).get(`/clinics/${faker.string.uuid()}`).expect(401)
    })

    it('returns 403 when DOCTOR tries to get by id', async () => {
      const { body: created } = await createClinic(adminToken, { name: 'Clinica Test', slug: 'clinica-test' }).expect(201)

      await request(app.getHttpServer())
        .get(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to get by id', async () => {
      const { body: created } = await createClinic(adminToken, { name: 'Clinica Test', slug: 'clinica-test' }).expect(201)

      await request(app.getHttpServer())
        .get(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })
  })

  describe('PATCH /clinics/:id', () => {
    it('returns 200 with updated ClinicResponseDto', async () => {
      const { body: created } = await createClinic(adminToken, { name: 'Clinica Antiga', slug: 'clinica-antiga' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Clinica Nova' })
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.name).toBe('Clinica Nova')
    })

    it('deactivates clinic via isActive false', async () => {
      const { body: created } = await createClinic(adminToken, { name: 'Clinica Test', slug: 'clinica-test' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200)

      expect(body.isActive).toBe(false)
    })

    it('does not conflict when updating with the same slug', async () => {
      const { body: created } = await createClinic(adminToken, { name: 'Clinica Test', slug: 'clinica-test' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'clinica-test' })
        .expect(200)

      expect(body.slug).toBe('clinica-test')
    })

    it('returns 409 when updating slug to one already used by another clinic', async () => {
      const { body: c1 } = await createClinic(adminToken, { name: 'Clinica A', slug: 'clinica-a' }).expect(201)
      await createClinic(adminToken, { name: 'Clinica B', slug: 'clinica-b' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/clinics/${c1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'clinica-b' })
        .expect(409)
    })

    it('returns 404 when clinic does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/clinics/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Nova Clinica' })
        .expect(404)
    })

    it('response never contains version or deletedAt', async () => {
      const { body: created } = await createClinic(adminToken, { name: 'Clinica Test', slug: 'clinica-test' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
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

    it('returns 403 when DOCTOR tries to update', async () => {
      const { body: created } = await createClinic(adminToken, { name: 'Clinica Test', slug: 'clinica-test' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ name: 'Nova Clinica' })
        .expect(403)
    })

    it('returns 403 when USER tries to update', async () => {
      const { body: created } = await createClinic(adminToken, { name: 'Clinica Test', slug: 'clinica-test' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/clinics/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Nova Clinica' })
        .expect(403)
    })
  })
})
