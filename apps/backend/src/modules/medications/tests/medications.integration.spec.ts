import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Medication } from '../entities/medication.entity'

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
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'

describe('MedicationsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let medicationRepository: Repository<Medication>
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
        email: `${role}.${faker.string.alphanumeric(6)}@medications.test`,
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
        email: `platform.${faker.string.alphanumeric(6)}@medications.test`,
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
    const match = cookies.find((c: string) => c?.startsWith('access_token='))
    return match ? match.slice('access_token='.length).split(';')[0] : ''
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.listen(0)

    userRepository = module.get(getRepositoryToken(User))
    clinicRepository = module.get(getRepositoryToken(Clinic))
    medicationRepository = module.get(getRepositoryToken(Medication))
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
    await medicationRepository.query('DELETE FROM test.medications')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
  })

  afterAll(async () => {
    await app.close()
  })

  function createMedication(token: string, payload: object) {
    return request(app.getHttpServer())
      .post('/medications')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
  }

  const dipirona = { name: 'Dipirona Sódica', activeIngredient: 'dipirona', therapeuticClass: 'ANALGESICOS' }

  describe('POST /medications', () => {
    it('returns 201 with a MANUAL medication on success', async () => {
      const { body } = await createMedication(platformAdminToken, dipirona).expect(201)

      expect(body.id).toBeDefined()
      expect(body.name).toBe('Dipirona Sódica')
      expect(body.source).toBe('manual')
      expect(body.isActive).toBe(true)
      expect(body.importHash).toBeUndefined()
    })

    it('returns 400 when an unknown field is sent', async () => {
      await createMedication(platformAdminToken, { ...dipirona, importHash: 'x' }).expect(400)
    })

    it('returns 400 when name is missing', async () => {
      await createMedication(platformAdminToken, { activeIngredient: 'x' }).expect(400)
    })

    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer()).post('/medications').send(dipirona).expect(401)
    })

    it('returns 403 when ADMIN tries to create', async () => {
      await createMedication(adminToken, dipirona).expect(403)
    })

    it('returns 403 when DOCTOR tries to create', async () => {
      await createMedication(doctorToken, dipirona).expect(403)
    })

    it('returns 403 when USER tries to create', async () => {
      await createMedication(userToken, dipirona).expect(403)
    })
  })

  describe('GET /medications', () => {
    it('returns a paginated payload', async () => {
      await createMedication(platformAdminToken, dipirona).expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/medications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body).toEqual(
        expect.objectContaining({ total: 1, page: 1, limit: 20 }),
      )
      expect(body.data).toHaveLength(1)
      expect(body.data[0].name).toBe('Dipirona Sódica')
    })

    it('filters by name/active ingredient via search', async () => {
      await createMedication(platformAdminToken, dipirona).expect(201)
      await createMedication(platformAdminToken, { name: 'Amoxicilina', activeIngredient: 'amoxicilina' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/medications?search=amox')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.total).toBe(1)
      expect(body.data[0].name).toBe('Amoxicilina')
    })

    it('hides inactive medications from ADMIN even with includeInactive=true', async () => {
      const { body: created } = await createMedication(platformAdminToken, dipirona).expect(201)
      await request(app.getHttpServer())
        .patch(`/medications/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ isActive: false })
        .expect(200)

      const { body } = await request(app.getHttpServer())
        .get('/medications?includeInactive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.total).toBe(0)
    })

    it('includes inactive medications for PLATFORM_ADMIN with includeInactive=true', async () => {
      const { body: created } = await createMedication(platformAdminToken, dipirona).expect(201)
      await request(app.getHttpServer())
        .patch(`/medications/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ isActive: false })
        .expect(200)

      const { body } = await request(app.getHttpServer())
        .get('/medications?includeInactive=true')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.data.some((m: any) => m.id === created.id)).toBe(true)
    })

    it('returns 403 for USER', async () => {
      await request(app.getHttpServer())
        .get('/medications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })

    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer()).get('/medications').expect(401)
    })
  })

  describe('GET /medications/:id', () => {
    it('returns the medication for DOCTOR', async () => {
      const { body: created } = await createMedication(platformAdminToken, dipirona).expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/medications/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
    })

    it('returns 404 when the medication does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/medications/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })
  })

  describe('PATCH /medications/:id', () => {
    it('updates the medication', async () => {
      const { body: created } = await createMedication(platformAdminToken, dipirona).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/medications/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Dipirona 500mg' })
        .expect(200)

      expect(body.name).toBe('Dipirona 500mg')
    })

    it('returns 404 when the medication does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/medications/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Inexistente' })
        .expect(404)
    })

    it('returns 403 when ADMIN tries to update', async () => {
      const { body: created } = await createMedication(platformAdminToken, dipirona).expect(201)

      await request(app.getHttpServer())
        .patch(`/medications/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'X' })
        .expect(403)
    })
  })

  describe('DELETE /medications/:id', () => {
    it('soft deletes the medication', async () => {
      const { body: created } = await createMedication(platformAdminToken, dipirona).expect(201)

      await request(app.getHttpServer())
        .delete(`/medications/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(204)

      const medication = await medicationRepository.findOne({
        where: { id: created.id },
        withDeleted: true,
      })
      expect(medication?.deletedAt).not.toBeNull()
    })

    it('returns 404 when the medication does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/medications/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    it('returns 403 when DOCTOR tries to delete', async () => {
      const { body: created } = await createMedication(platformAdminToken, dipirona).expect(201)

      await request(app.getHttpServer())
        .delete(`/medications/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })
  })
})
