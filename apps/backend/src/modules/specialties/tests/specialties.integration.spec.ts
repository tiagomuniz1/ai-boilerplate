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
import { Specialty } from '../entities/specialty.entity'

process.env.NODE_ENV = 'test'
process.env.DB_SCHEMA = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'

describe('SpecialtiesController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let specialtyRepository: Repository<Specialty>
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
    await app.init()

    userRepository = module.get(getRepositoryToken(User))
    specialtyRepository = module.get(getRepositoryToken(Specialty))
  })

  beforeEach(async () => {
    adminToken = await loginAs(UserRole.ADMIN)
    doctorToken = await loginAs(UserRole.DOCTOR)
    userToken = await loginAs(UserRole.USER)
  })

  afterEach(async () => {
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.users')
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
      const { body } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      expect(body.id).toBeDefined()
      expect(body.name).toBe('Cardiologia')
      expect(body.description).toBeNull()
      expect(body.createdAt).toBeDefined()
      expect(body.updatedAt).toBeDefined()
    })

    it('returns 201 with description when provided', async () => {
      const { body } = await createSpecialty(adminToken, {
        name: 'Neurologia',
        description: 'Especialidade do sistema nervoso',
      }).expect(201)

      expect(body.description).toBe('Especialidade do sistema nervoso')
    })

    it('response never contains version or deletedAt', async () => {
      const { body } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 409 when name already in use by active specialty', async () => {
      await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)
      await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(409)
    })

    it('returns 409 for case-insensitive duplicate name', async () => {
      await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)
      await createSpecialty(adminToken, { name: 'cardiologia' }).expect(409)
    })

    it('returns 201 when reusing name of soft-deleted specialty', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204)

      await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)
    })

    it('returns 400 when name is too short', async () => {
      await createSpecialty(adminToken, { name: 'AB' }).expect(400)
    })

    it('returns 400 when unknown field is sent', async () => {
      await createSpecialty(adminToken, { name: 'Cardiologia', unknownField: 'value' }).expect(400)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).post('/specialties').send({ name: 'Cardiologia' }).expect(401)
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
      await createSpecialty(adminToken, { name: 'Cardiologia' })
      await createSpecialty(adminToken, { name: 'Neurologia' })

      const { body } = await request(app.getHttpServer())
        .get('/specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.data).toBeDefined()
      expect(body.total).toBeGreaterThanOrEqual(2)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
    })

    it('filters by name via search param', async () => {
      await createSpecialty(adminToken, { name: 'Cardiologia' })
      await createSpecialty(adminToken, { name: 'Neurologia' })

      const { body } = await request(app.getHttpServer())
        .get('/specialties?search=Cardio')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.data.some((s: any) => s.name === 'Cardiologia')).toBe(true)
      expect(body.data.every((s: any) => s.name !== 'Neurologia')).toBe(true)
    })

    it('response data never contains version or deletedAt', async () => {
      await createSpecialty(adminToken, { name: 'Cardiologia' })

      const { body } = await request(app.getHttpServer())
        .get('/specialties')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      body.data.forEach((s: any) => {
        expect(s.version).toBeUndefined()
        expect(s.deletedAt).toBeUndefined()
      })
    })

    it('returns 400 when limit exceeds 100', async () => {
      await request(app.getHttpServer())
        .get('/specialties?limit=101')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)
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
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.name).toBe('Cardiologia')
      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 404 when specialty does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/specialties/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })

    it('returns 404 when searching by id after deletion', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .get(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })

    it('returns 200 for DOCTOR', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .get(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)
    })

    it('returns 200 for USER', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

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
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Neurologia' })
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.name).toBe('Neurologia')
    })

    it('clears description when null is sent', async () => {
      const { body: created } = await createSpecialty(adminToken, {
        name: 'Cardiologia',
        description: 'Old description',
      }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: null })
        .expect(200)

      expect(body.description).toBeNull()
    })

    it('does not conflict when updating with the same name', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cardiologia' })
        .expect(200)

      expect(body.name).toBe('Cardiologia')
    })

    it('returns 409 when updating to a name already used by another specialty', async () => {
      const { body: s1 } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)
      await createSpecialty(adminToken, { name: 'Neurologia' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/specialties/${s1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Neurologia' })
        .expect(409)
    })

    it('returns 404 when specialty does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/specialties/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Neurologia' })
        .expect(404)
    })

    it('response never contains version or deletedAt', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Neurologia' })
        .expect(200)

      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).patch(`/specialties/${faker.string.uuid()}`).send({ name: 'X' }).expect(401)
    })

    it('returns 403 when DOCTOR tries to update', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ name: 'Neurologia' })
        .expect(403)
    })

    it('returns 403 when USER tries to update', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Neurologia' })
        .expect(403)
    })
  })

  describe('DELETE /specialties/:id', () => {
    it('returns 204 on successful soft delete', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204)
    })

    it('sets deleted_at on the record (soft delete)', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
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
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })

    it('returns 404 when trying to delete an already deleted specialty', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })

    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer()).delete(`/specialties/${faker.string.uuid()}`).expect(401)
    })

    it('returns 403 when DOCTOR tries to delete', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to delete', async () => {
      const { body: created } = await createSpecialty(adminToken, { name: 'Cardiologia' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/specialties/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })
  })
})
