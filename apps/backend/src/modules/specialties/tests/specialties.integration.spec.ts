import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { CouncilType, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Specialty } from '../entities/specialty.entity'

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

describe('SpecialtiesController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let specialtyRepository: Repository<Specialty>
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
        email: `${role}.${faker.string.alphanumeric(6)}@specialties.test`,
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
        email: `platform.${faker.string.alphanumeric(6)}@specialties.test`,
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
  })

  beforeEach(async () => {
    await clinicRepository.save(
      clinicRepository.create({ id: SEED_CLINIC_ID, name: 'Seed Clinic', slug: 'seed-clinic', isActive: true }),
    )

    platformAdminToken = await loginAsPlatformAdmin()
    adminToken = await loginAs(UserRole.ADMIN)
    doctorToken = await loginAs(UserRole.DOCTOR)
    userToken = await loginAs(UserRole.USER)
  })

  afterEach(async () => {
    await specialtyRepository.query('DELETE FROM test.schedules')
    await specialtyRepository.query('DELETE FROM test.professional_specialties')
    await specialtyRepository.query('DELETE FROM test.professionals')
    await specialtyRepository.query('DELETE FROM test.patients')
    await specialtyRepository.query('DELETE FROM test.clinic_specialties')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await specialtyRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
  })

  afterAll(async () => {
    await app.close()
  })

  function createSpecialty(token: string, payload: object) {
    return request(app.getHttpServer())
      .post('/specialties')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
  }

  describe('POST /specialties', () => {
    it('returns 201 with SpecialtyResponseDto on success', async () => {
      const { body } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      expect(body.id).toBeDefined()
      expect(body.name).toBe('Cardiologia')
      expect(body.description).toBeNull()
      expect(body.createdAt).toBeDefined()
      expect(body.updatedAt).toBeDefined()
    })

    it('returns 201 with description when provided', async () => {
      const { body } = await createSpecialty(platformAdminToken, {
        name: 'Neurologia',
        description: 'Especialidade do sistema nervoso',
      }).expect(201)

      expect(body.description).toBe('Especialidade do sistema nervoso')
    })

    it('returns null titleName by default and persists it when provided', async () => {
      const { body: withoutTitle } = await createSpecialty(platformAdminToken, { name: 'Ortopedia' }).expect(201)
      expect(withoutTitle.titleName).toBeNull()

      const { body: withTitle } = await createSpecialty(platformAdminToken, {
        name: 'Mastologia',
        titleName: 'mastologista',
      }).expect(201)
      expect(withTitle.titleName).toBe('mastologista')
    })

    it('response never contains version or deletedAt', async () => {
      const { body } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 409 when name already in use by active specialty', async () => {
      await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)
      await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(409)
    })

    it('returns 409 for case-insensitive duplicate name', async () => {
      await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)
      await createSpecialty(platformAdminToken, { name: 'cardiologia' }).expect(409)
    })

    it('returns 201 when reusing name of soft-deleted specialty', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(204)

      await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)
    })

    it('returns 400 when name is too short', async () => {
      await createSpecialty(platformAdminToken, { name: 'AB' }).expect(400)
    })

    it('returns 400 when unknown field is sent', async () => {
      await createSpecialty(platformAdminToken, { name: 'Cardiologia', unknownField: 'value' }).expect(400)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).post('/specialties').send({ name: 'Cardiologia' }).expect(401)
    })

    it('returns 403 when ADMIN tries to create', async () => {
      await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(403)
    })

    it('returns 403 when DOCTOR tries to create', async () => {
      await createSpecialty(doctorToken, { name: 'Cardiologia' }).expect(403)
    })

    it('returns 403 when USER tries to create', async () => {
      await createSpecialty(userToken, { name: 'Cardiologia' }).expect(403)
    })
  })

  describe('GET /specialties', () => {
    it('returns 200 with paginated response', async () => {
      await createSpecialty(platformAdminToken, { name: 'Cardiologia' })
      await createSpecialty(platformAdminToken, { name: 'Neurologia' })

      const { body } = await request(app.getHttpServer())
        .get('/specialties')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.data).toBeDefined()
      expect(body.total).toBeGreaterThanOrEqual(2)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
    })

    it('filters by name via search param', async () => {
      await createSpecialty(platformAdminToken, { name: 'Cardiologia' })
      await createSpecialty(platformAdminToken, { name: 'Neurologia' })

      const { body } = await request(app.getHttpServer())
        .get('/specialties?search=Cardio')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.data.some((s: any) => s.name === 'Cardiologia')).toBe(true)
      expect(body.data.every((s: any) => s.name !== 'Neurologia')).toBe(true)
    })

    it('response data never contains version or deletedAt', async () => {
      await createSpecialty(platformAdminToken, { name: 'Cardiologia' })

      const { body } = await request(app.getHttpServer())
        .get('/specialties')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      body.data.forEach((s: any) => {
        expect(s.version).toBeUndefined()
        expect(s.deletedAt).toBeUndefined()
      })
    })

    it('returns 400 when limit exceeds 100', async () => {
      await request(app.getHttpServer())
        .get('/specialties?limit=101')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(400)
    })

    it('returns 200 for ADMIN', async () => {
      await request(app.getHttpServer())
        .get('/specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })

    it('returns 200 for DOCTOR', async () => {
      await request(app.getHttpServer())
        .get('/specialties')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)
    })

    it('returns 200 for USER', async () => {
      await request(app.getHttpServer())
        .get('/specialties')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).get('/specialties').expect(401)
    })
  })

  describe('GET /specialties/:id', () => {
    it('returns 200 with SpecialtyResponseDto', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.name).toBe('Cardiologia')
      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 404 when specialty does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/specialties/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    it('returns 404 when searching by id after deletion', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .get(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    it('returns 200 for ADMIN', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .get(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })

    it('returns 200 for DOCTOR', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .get(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)
    })

    it('returns 200 for USER', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .get(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).get(`/specialties/${faker.string.uuid()}`).expect(401)
    })
  })

  describe('PATCH /specialties/:id', () => {
    it('returns 200 with updated SpecialtyResponseDto', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Neurologia' })
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.name).toBe('Neurologia')
    })

    it('updates and clears the titleName', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, {
        name: 'Mastologia',
        titleName: 'mastologista',
      }).expect(201)

      const { body: updated } = await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ titleName: 'especialista em mama' })
        .expect(200)
      expect(updated.titleName).toBe('especialista em mama')

      const { body: cleared } = await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ titleName: null })
        .expect(200)
      expect(cleared.titleName).toBeNull()
    })

    it('clears description when null is sent', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, {
        name: 'Cardiologia',
        description: 'Old description',
      }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ description: null })
        .expect(200)

      expect(body.description).toBeNull()
    })

    it('does not conflict when updating with the same name', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Cardiologia' })
        .expect(200)

      expect(body.name).toBe('Cardiologia')
    })

    it('returns 409 when updating to a name already used by another specialty', async () => {
      const { body: s1 } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)
      await createSpecialty(platformAdminToken, { name: 'Neurologia' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/specialties/${s1.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Neurologia' })
        .expect(409)
    })

    it('returns 404 when specialty does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/specialties/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Neurologia' })
        .expect(404)
    })

    it('response never contains version or deletedAt', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Neurologia' })
        .expect(200)

      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).patch(`/specialties/${faker.string.uuid()}`).send({ name: 'X' }).expect(401)
    })

    it('returns 403 when ADMIN tries to update', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Neurologia' })
        .expect(403)
    })

    it('returns 403 when DOCTOR tries to update', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ name: 'Neurologia' })
        .expect(403)
    })

    it('returns 403 when USER tries to update', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Neurologia' })
        .expect(403)
    })
  })

  describe('DELETE /specialties/:id', () => {
    it('returns 204 on successful soft delete', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(204)
    })

    it('sets deleted_at on the record (soft delete)', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(204)

      const deleted = await specialtyRepository.findOne({
        where: { id: created.id },
        withDeleted: true,
      })
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('returns 404 when specialty does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/specialties/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    it('returns 404 when trying to delete an already deleted specialty', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).delete(`/specialties/${faker.string.uuid()}`).expect(401)
    })

    it('returns 403 when ADMIN tries to delete', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
    })

    it('returns 403 when DOCTOR tries to delete', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to delete', async () => {
      const { body: created } = await createSpecialty(platformAdminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })

    it('returns 409 when specialty is linked to an active doctor', async () => {
      const { body: specialty } = await createSpecialty(platformAdminToken, { name: 'Ortopedia' }).expect(201)

      const hashedPassword = await (await import('bcrypt')).hash('Password123!', 1)
      const doctorUser = await userRepository.save(
        userRepository.create({
          fullName: 'Dr. Ortopedista',
          email: `ortopedista.${faker.string.alphanumeric(6)}@test.com`,
          password: hashedPassword,
          role: UserRole.DOCTOR,
          isActive: true,
          clinicId: SEED_CLINIC_ID,
        }),
      )

      await request(app.getHttpServer())
        .post('/professionals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: doctorUser.id, registrations: [{ councilType: CouncilType.CRM, number: '77777', state: 'SP', isPrimary: true }], specialties: [{ specialtyId: specialty.id }] })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .delete(`/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(409)

      expect(body.detail).toContain('doctor')
    })

    it('returns 409 when specialty is linked to a clinic', async () => {
      const { body: specialty } = await createSpecialty(platformAdminToken, { name: 'Pediatria' }).expect(201)

      await specialtyRepository.query(
        'INSERT INTO test.clinic_specialties (clinic_id, specialty_id) VALUES ($1, $2)',
        [SEED_CLINIC_ID, specialty.id],
      )

      const { body } = await request(app.getHttpServer())
        .delete(`/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(409)

      expect(body.detail).toContain('clinic')
    })

    it('allows deletion after all linked doctors are removed', async () => {
      const { body: specialty } = await createSpecialty(platformAdminToken, { name: 'Reumatologia' }).expect(201)

      const hashedPassword = await (await import('bcrypt')).hash('Password123!', 1)
      const doctorUser = await userRepository.save(
        userRepository.create({
          fullName: 'Dr. Reumatologista',
          email: `reumatologista.${faker.string.alphanumeric(6)}@test.com`,
          password: hashedPassword,
          role: UserRole.DOCTOR,
          isActive: true,
          clinicId: SEED_CLINIC_ID,
        }),
      )

      const { body: doctor } = await request(app.getHttpServer())
        .post('/professionals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: doctorUser.id, registrations: [{ councilType: CouncilType.CRM, number: '88888', state: 'SP', isPrimary: true }], specialties: [{ specialtyId: specialty.id }] })
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(409)

      await request(app.getHttpServer())
        .delete(`/professionals/${doctor.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .delete(`/specialties/${specialty.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(204)
    })
  })
})
