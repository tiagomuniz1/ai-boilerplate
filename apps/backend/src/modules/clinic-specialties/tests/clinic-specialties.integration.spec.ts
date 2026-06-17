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
import { Specialty } from '../../specialties/entities/specialty.entity'
import { User } from '../../users/entities/user.entity'
import { ClinicSpecialty } from '../entities/clinic-specialty.entity'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000001'

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

describe('ClinicSpecialtiesController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let specialtyRepository: Repository<Specialty>
  let clinicSpecialtyRepository: Repository<ClinicSpecialty>
  let platformAdminToken: string
  let adminToken: string
  let clinicId: string

  async function loginAsPlatformAdmin(): Promise<string> {
    const password = 'Password123!'
    const hashedPassword = await bcrypt.hash(password, 1)
    const user = await userRepository.save(
      userRepository.create({
        fullName: 'Platform Admin',
        email: `platform.${faker.string.alphanumeric(6)}@clinic-specialties.test`,
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

  async function loginAsClinicAdmin(forClinicId: string): Promise<string> {
    const password = 'Password123!'
    const hashedPassword = await bcrypt.hash(password, 1)
    const user = await userRepository.save(
      userRepository.create({
        fullName: 'Clinic Admin',
        email: `admin.${faker.string.alphanumeric(6)}@clinic-specialties.test`,
        password: hashedPassword,
        role: UserRole.ADMIN,
        clinicId: forClinicId,
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password, slug: 'seed-clinic-sp' })

    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const match = cookies.find((c: string) => c.startsWith('access_token_seed-clinic-sp='))
    return match ? match.slice('access_token_seed-clinic-sp='.length).split(';')[0] : ''
  }

  async function createSpecialty(name: string): Promise<Specialty> {
    return specialtyRepository.save(specialtyRepository.create({ name }))
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
    specialtyRepository = module.get(getRepositoryToken(Specialty))
    clinicSpecialtyRepository = module.get(getRepositoryToken(ClinicSpecialty))
  })

  beforeEach(async () => {
    const clinic = await clinicRepository.save(
      clinicRepository.create({
        id: SEED_CLINIC_ID,
        name: 'Seed Clinic SP',
        slug: 'seed-clinic-sp',
        isActive: true,
      }),
    )
    clinicId = clinic.id

    platformAdminToken = await loginAsPlatformAdmin()
    adminToken = await loginAsClinicAdmin(clinicId)
  })

  afterEach(async () => {
    await clinicSpecialtyRepository.query('DELETE FROM test.clinic_specialties')
    await clinicSpecialtyRepository.query('DELETE FROM test.schedules')
    await clinicSpecialtyRepository.query('DELETE FROM test.doctor_specialties')
    await clinicSpecialtyRepository.query('DELETE FROM test.doctors')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /clinics/:clinicId/specialties/:specialtyId', () => {
    it('returns 201 with ClinicSpecialtyResponseDto on success', async () => {
      const specialty = await createSpecialty('Cardiologia')

      const { body } = await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(201)

      expect(body.id).toBeDefined()
      expect(body.clinicId).toBe(clinicId)
      expect(body.specialtyId).toBe(specialty.id)
      expect(body.name).toBe('Cardiologia')
      expect(body.description).toBeNull()
      expect(body.linkedAt).toBeDefined()
    })

    it('returns 409 when specialty is already linked', async () => {
      const specialty = await createSpecialty('Neurologia')

      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(201)

      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(409)
    })

    it('returns 404 when clinic does not exist', async () => {
      const specialty = await createSpecialty('Ortopedia')

      await request(app.getHttpServer())
        .post(`/clinics/${faker.string.uuid()}/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    it('returns 404 when specialty does not exist', async () => {
      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/specialties/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    it('returns 403 when ADMIN tries to link', async () => {
      const specialty = await createSpecialty('Pediatria')

      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/specialties/${faker.string.uuid()}`)
        .expect(401)
    })
  })

  describe('DELETE /clinics/:clinicId/specialties/:specialtyId', () => {
    it('returns 204 on successful unlink', async () => {
      const specialty = await createSpecialty('Dermatologia')

      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/clinics/${clinicId}/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(204)

      const record = await clinicSpecialtyRepository.findOneBy({
        clinicId,
        specialtyId: specialty.id,
      })
      expect(record).toBeNull()
    })

    it('returns 404 when specialty is not linked to clinic', async () => {
      const specialty = await createSpecialty('Reumatologia')

      await request(app.getHttpServer())
        .delete(`/clinics/${clinicId}/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    it('returns 403 when ADMIN tries to unlink', async () => {
      const specialty = await createSpecialty('Oftalmologia')

      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/clinics/${clinicId}/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .delete(`/clinics/${clinicId}/specialties/${faker.string.uuid()}`)
        .expect(401)
    })
  })

  describe('GET /clinics/:clinicId/specialties', () => {
    it('returns 200 with paginated response for PLATFORM_ADMIN', async () => {
      const s1 = await createSpecialty('Cardiologia')
      const s2 = await createSpecialty('Neurologia')

      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/specialties/${s1.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)

      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/specialties/${s2.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)

      const { body } = await request(app.getHttpServer())
        .get(`/clinics/${clinicId}/specialties`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.data).toBeDefined()
      expect(body.total).toBe(2)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
    })

    it('returns 200 for clinic ADMIN accessing own clinic', async () => {
      await request(app.getHttpServer())
        .get(`/clinics/${clinicId}/specialties`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })

    it('filters by search param', async () => {
      const s1 = await createSpecialty('Cardiologia')
      const s2 = await createSpecialty('Neurologia')

      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/specialties/${s1.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)

      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/specialties/${s2.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)

      const { body } = await request(app.getHttpServer())
        .get(`/clinics/${clinicId}/specialties?search=Cardio`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.data).toHaveLength(1)
      expect(body.data[0].name).toBe('Cardiologia')
    })

    it('returns 403 when ADMIN accesses different clinic', async () => {
      const otherClinic = await clinicRepository.save(
        clinicRepository.create({ name: 'Other Clinic', slug: 'other-clinic', isActive: true }),
      )

      await request(app.getHttpServer())
        .get(`/clinics/${otherClinic.id}/specialties`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
    })

    it('returns 404 when clinic does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/clinics/${faker.string.uuid()}/specialties`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    it('returns 400 when limit exceeds 100', async () => {
      await request(app.getHttpServer())
        .get(`/clinics/${clinicId}/specialties?limit=101`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(400)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .get(`/clinics/${clinicId}/specialties`)
        .expect(401)
    })

    it('returns empty list when clinic has no linked specialties', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/clinics/${clinicId}/specialties`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.data).toHaveLength(0)
      expect(body.total).toBe(0)
    })
  })
})
