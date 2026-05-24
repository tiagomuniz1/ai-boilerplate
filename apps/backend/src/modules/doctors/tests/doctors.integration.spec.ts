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
import { Doctor } from '../entities/doctor.entity'

process.env.NODE_ENV = 'test'
process.env.DB_SCHEMA = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'

describe('DoctorsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let doctorRepository: Repository<Doctor>
  let accessToken: string
  let authUserId: string

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
    doctorRepository = module.get(getRepositoryToken(Doctor))
  })

  beforeEach(async () => {
    const password = 'Password123!'
    const hashedPassword = await bcrypt.hash(password, 1)
    const authUser = await userRepository.save(
      userRepository.create({
        fullName: 'Test Auth User',
        email: 'auth@doctors.test',
        password: hashedPassword,
        role: UserRole.ADMIN,
      }),
    )
    authUserId = authUser.id

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: authUser.email, password })

    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const match = cookies.find((c) => c.startsWith('access_token='))
    accessToken = match ? match.slice('access_token='.length).split(';')[0] : ''
  })

  afterEach(async () => {
    await doctorRepository.query('DELETE FROM test.doctors')
    await userRepository.query('DELETE FROM test.users')
  })

  afterAll(async () => {
    await app.close()
  })

  async function createTargetUser() {
    return userRepository.save(
      userRepository.create({
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        password: 'hashed',
      }),
    )
  }

  function makePayload(userId: string, overrides: Partial<{
    crmNumber: string
    specialty: string
    bio: string
  }> = {}) {
    return {
      userId,
      crmNumber: '12345/SP',
      specialty: 'Cardiologia',
      ...overrides,
    }
  }

  function createDoctor(userId: string, overrides = {}) {
    return request(app.getHttpServer())
      .post('/doctors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(makePayload(userId, overrides))
  }

  describe('POST /doctors', () => {
    it('returns 201 with DoctorResponseDto on success', async () => {
      const targetUser = await createTargetUser()
      const payload = makePayload(targetUser.id)

      const { body } = await createDoctor(targetUser.id).expect(201)

      expect(body.id).toBeDefined()
      expect(body.user.id).toBe(targetUser.id)
      expect(body.user.fullName).toBe(targetUser.fullName)
      expect(body.user.email).toBe(targetUser.email)
      expect(body.crmNumber).toBe(payload.crmNumber)
      expect(body.specialty).toBe(payload.specialty)
      expect(body.bio).toBeNull()
      expect(body.createdAt).toBeDefined()
      expect(body.updatedAt).toBeDefined()
    })

    it('response never contains version, deletedAt or password', async () => {
      const targetUser = await createTargetUser()
      const { body } = await createDoctor(targetUser.id).expect(201)

      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
      expect(body.user.password).toBeUndefined()
    })

    it('returns 404 when userId does not exist', async () => {
      await createDoctor(faker.string.uuid()).expect(404)
    })

    it('returns 409 when user already has a doctor profile', async () => {
      const targetUser = await createTargetUser()
      await createDoctor(targetUser.id).expect(201)
      await createDoctor(targetUser.id).expect(409)
    })

    it('returns 409 when CRM number is already in use', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()

      await createDoctor(user1.id, { crmNumber: '99999/RJ' }).expect(201)
      await createDoctor(user2.id, { crmNumber: '99999/RJ' }).expect(409)
    })

    it('returns 400 when CRM format is invalid', async () => {
      const targetUser = await createTargetUser()
      await createDoctor(targetUser.id, { crmNumber: '123-SP' }).expect(400)
    })

    it('returns 400 when specialty is too short', async () => {
      const targetUser = await createTargetUser()
      await createDoctor(targetUser.id, { specialty: 'AB' }).expect(400)
    })

    it('returns 400 when unknown field is sent', async () => {
      const targetUser = await createTargetUser()
      await request(app.getHttpServer())
        .post('/doctors')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...makePayload(targetUser.id), unknownField: 'value' })
        .expect(400)
    })
  })

  describe('GET /doctors', () => {
    it('returns 200 with paginated response', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()
      await createDoctor(user1.id, { crmNumber: '11111/SP' })
      await createDoctor(user2.id, { crmNumber: '22222/SP' })

      const { body } = await request(app.getHttpServer())
        .get('/doctors')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.data).toBeDefined()
      expect(body.total).toBeGreaterThanOrEqual(2)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
    })

    it('filters by specialty via search param', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()
      await createDoctor(user1.id, { crmNumber: '11111/SP', specialty: 'Cardiologia' })
      await createDoctor(user2.id, { crmNumber: '22222/SP', specialty: 'Neurologia' })

      const { body } = await request(app.getHttpServer())
        .get('/doctors?search=Cardio')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.data.some((d: any) => d.specialty === 'Cardiologia')).toBe(true)
      expect(body.data.every((d: any) => d.specialty !== 'Neurologia')).toBe(true)
    })

    it('response data never contains version', async () => {
      const targetUser = await createTargetUser()
      await createDoctor(targetUser.id)

      const { body } = await request(app.getHttpServer())
        .get('/doctors')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      body.data.forEach((d: any) => {
        expect(d.version).toBeUndefined()
      })
    })

    it('returns 400 when limit exceeds 100', async () => {
      await request(app.getHttpServer())
        .get('/doctors?limit=101')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400)
    })
  })

  describe('GET /doctors/:id', () => {
    it('returns 200 with DoctorResponseDto', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.user.id).toBe(targetUser.id)
      expect(body.version).toBeUndefined()
    })

    it('returns 404 when doctor does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/doctors/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })
  })

  describe('PATCH /doctors/:id', () => {
    it('returns 200 with updated DoctorResponseDto', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ specialty: 'Neurologia' })
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.specialty).toBe('Neurologia')
      expect(body.crmNumber).toBe(created.crmNumber)
    })

    it('returns 404 when doctor does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/doctors/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ specialty: 'Neurologia' })
        .expect(404)
    })

    it('returns 409 when updating to a CRM already in use', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()
      await createDoctor(user1.id, { crmNumber: '11111/SP' }).expect(201)
      const { body: d2 } = await createDoctor(user2.id, { crmNumber: '22222/SP' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/doctors/${d2.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ crmNumber: '11111/SP' })
        .expect(409)
    })

    it('returns 400 when trying to update with invalid CRM format', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .patch(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ crmNumber: 'INVALID' })
        .expect(400)
    })

    it('response never contains version', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ specialty: 'Neurologia' })
        .expect(200)

      expect(body.version).toBeUndefined()
    })
  })

  describe('DELETE /doctors/:id', () => {
    it('returns 204 on successful soft delete', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)
    })

    it('sets deleted_at on the record (soft delete)', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const deleted = await doctorRepository.findOne({
        where: { id: created.id },
        withDeleted: true,
      })
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('returns 404 when doctor does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/doctors/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 404 when searching by id after deletion', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .get(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 404 when trying to delete an already deleted doctor', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('allows creating a new doctor with a previously soft-deleted CRM', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()
      const { body: created } = await createDoctor(user1.id, { crmNumber: '55555/MG' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      await createDoctor(user2.id, { crmNumber: '55555/MG' }).expect(201)
    })
  })

  describe('JWT Guard', () => {
    it('returns 401 on protected endpoint without token', async () => {
      await request(app.getHttpServer()).get('/doctors').expect(401)
    })
  })
})
