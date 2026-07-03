import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { PatientGender, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Patient } from '../entities/patient.entity'

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

describe('PatientsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let patientRepository: Repository<Patient>
  let accessToken: string
  let doctorToken: string
  let userToken: string

  async function loginAs(role: UserRole): Promise<string> {
    const password = 'Password123!'
    const hashedPassword = await bcrypt.hash(password, 1)
    const user = await userRepository.save(
      userRepository.create({
        fullName: `Test ${role} User`,
        email: `${role}.${faker.string.alphanumeric(6)}@patients.test`,
        password: hashedPassword,
        role,
        isActive: true,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password, slug: 'seed-clinic' })
    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string | undefined
    if (!setCookieHeader) return ''
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const match = cookies.find((c: string) => c?.startsWith('access_token_seed-clinic='))
    return match ? match.slice('access_token_seed-clinic='.length).split(';')[0] : ''
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
    patientRepository = module.get(getRepositoryToken(Patient))
  })

  beforeEach(async () => {
    await clinicRepository.save(
      clinicRepository.create({ id: SEED_CLINIC_ID, name: 'Seed Clinic', slug: 'seed-clinic', isActive: true }),
    )

    accessToken = await loginAs(UserRole.ADMIN)
    doctorToken = await loginAs(UserRole.DOCTOR)
    userToken = await loginAs(UserRole.USER)
  })

  afterEach(async () => {
    await patientRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.doctor_specialties')
    await patientRepository.query('DELETE FROM test.doctors')
    await patientRepository.query('DELETE FROM test.patients')
    await patientRepository.query('DELETE FROM test.specialties')
    await patientRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
  })

  afterAll(async () => {
    await app.close()
  })

  function makePayload(overrides: Partial<{
    fullName: string
    documentNumber: string
    email: string
    phoneNumber: string
    birthDate: string
    gender: PatientGender
  }> = {}) {
    return {
      fullName: faker.person.fullName(),
      documentNumber: '12345678901',
      email: faker.internet.email(),
      phoneNumber: '(11) 99999-9999',
      birthDate: '1990-05-15',
      gender: PatientGender.MALE,
      ...overrides,
    }
  }

  function createPatient(overrides = {}) {
    return request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(makePayload(overrides))
  }

  describe('POST /patients', () => {
    it('returns 201 with PatientResponseDto on success', async () => {
      const payload = makePayload()
      const { body } = await createPatient(payload).expect(201)

      expect(body.id).toBeDefined()
      expect(body.user).toBeDefined()
      expect(body.user.fullName).toBe(payload.fullName)
      expect(body.user.email).toBe(payload.email)
      expect(body.user.isActive).toBe(false)
      expect(body.documentNumber).toBe(payload.documentNumber)
      expect(body.phoneNumber).toBe(payload.phoneNumber)
      expect(body.birthDate).toBe(payload.birthDate)
      expect(body.gender).toBe(PatientGender.MALE)
      expect(body.createdAt).toBeDefined()
      expect(body.updatedAt).toBeDefined()
    })

    it('response never contains version or deletedAt', async () => {
      const { body } = await createPatient().expect(201)
      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
    })

    it('returns 409 when documentNumber already in use', async () => {
      await createPatient({ documentNumber: '11122233344' }).expect(201)
      await createPatient({
        documentNumber: '11122233344',
        email: faker.internet.email(),
      }).expect(409)
    })

    it('returns 409 when email already in use', async () => {
      const email = faker.internet.email()
      await createPatient({ email }).expect(201)
      await createPatient({
        documentNumber: '99988877766',
        email,
      }).expect(409)
    })

    it('returns 400 when birthDate is in the future', async () => {
      const future = new Date()
      future.setFullYear(future.getFullYear() + 1)
      await createPatient({ birthDate: future.toISOString().split('T')[0] }).expect(400)
    })

    it('returns 400 when documentNumber has wrong format', async () => {
      await createPatient({ documentNumber: '123' }).expect(400)
    })

    it('returns 400 when fullName is too short', async () => {
      await createPatient({ fullName: 'AB' }).expect(400)
    })

    it('returns 400 when email is invalid', async () => {
      await createPatient({ email: 'invalid' }).expect(400)
    })

    it('returns 400 when unknown field is sent (documentNumber in update)', async () => {
      await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...makePayload(), unknownField: 'value' })
        .expect(400)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).post('/patients').send(makePayload()).expect(401)
    })

    it('returns 403 when DOCTOR tries to create', async () => {
      await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(makePayload())
        .expect(403)
    })

    it('returns 403 when USER tries to create', async () => {
      await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${userToken}`)
        .send(makePayload())
        .expect(403)
    })
  })

  describe('GET /patients', () => {
    it('returns 200 with paginated response', async () => {
      await createPatient({ documentNumber: '11111111111' })
      await createPatient({ documentNumber: '22222222222', email: faker.internet.email() })

      const { body } = await request(app.getHttpServer())
        .get('/patients')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.data).toBeDefined()
      expect(body.total).toBeGreaterThanOrEqual(2)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
    })

    it('filters by search term (fullName partial match)', async () => {
      await createPatient({ fullName: 'Fulano de Tal', documentNumber: '11111111111' })
      await createPatient({ fullName: 'Ciclano Sousa', documentNumber: '22222222222', email: faker.internet.email() })

      const { body } = await request(app.getHttpServer())
        .get('/patients?search=Fulano')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.data.some((p: any) => p.user.fullName === 'Fulano de Tal')).toBe(true)
      expect(body.data.every((p: any) => p.user.fullName !== 'Ciclano Sousa')).toBe(true)
    })

    it('filters by documentNumber exact match', async () => {
      await createPatient({ documentNumber: '11111111111' })
      await createPatient({ documentNumber: '22222222222', email: faker.internet.email() })

      const { body } = await request(app.getHttpServer())
        .get('/patients?search=11111111111')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.data).toHaveLength(1)
      expect(body.data[0].documentNumber).toBe('11111111111')
    })

    it('returns 400 when limit exceeds 100', async () => {
      await request(app.getHttpServer())
        .get('/patients?limit=101')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400)
    })

    it('response data never contains version', async () => {
      await createPatient()

      const { body } = await request(app.getHttpServer())
        .get('/patients')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      body.data.forEach((p: any) => {
        expect(p.version).toBeUndefined()
      })
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/patients').expect(401)
    })

    it('returns 200 for DOCTOR (read access)', async () => {
      await request(app.getHttpServer())
        .get('/patients')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)
    })

    it('returns 200 for USER', async () => {
      await request(app.getHttpServer())
        .get('/patients')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
    })
  })

  describe('GET /patients/:id', () => {
    it('returns 200 with PatientResponseDto', async () => {
      const { body: created } = await createPatient().expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.documentNumber).toBe(created.documentNumber)
      expect(body.version).toBeUndefined()
    })

    it('returns 404 when patient does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/patients/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get(`/patients/${faker.string.uuid()}`).expect(401)
    })

    it('returns 200 for DOCTOR (read access)', async () => {
      const { body: created } = await createPatient().expect(201)

      await request(app.getHttpServer())
        .get(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)
    })

    it('returns 200 for USER', async () => {
      const { body: created } = await createPatient().expect(201)

      await request(app.getHttpServer())
        .get(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
    })
  })

  describe('PATCH /patients/:id', () => {
    it('returns 200 with updated PatientResponseDto', async () => {
      const { body: created } = await createPatient().expect(201)
      const newName = faker.person.fullName()

      const { body } = await request(app.getHttpServer())
        .patch(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: newName })
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.user.fullName).toBe(newName)
      expect(body.documentNumber).toBe(created.documentNumber)
    })

    it('returns 404 when patient does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/patients/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: 'New Name' })
        .expect(404)
    })

    it('returns 400 when trying to update documentNumber', async () => {
      const { body: created } = await createPatient().expect(201)

      await request(app.getHttpServer())
        .patch(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentNumber: '99999999999' })
        .expect(400)
    })

    it('returns 409 when new email is already in use by another account', async () => {
      const { body: p1 } = await createPatient({ documentNumber: '11111111111' }).expect(201)
      const { body: p2 } = await createPatient({ documentNumber: '22222222222', email: faker.internet.email() }).expect(201)

      await request(app.getHttpServer())
        .patch(`/patients/${p1.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: p2.user.email })
        .expect(409)
    })

    it('updates both user and patient fields when provided together', async () => {
      const { body: created } = await createPatient().expect(201)
      const newName = faker.person.fullName()

      const { body } = await request(app.getHttpServer())
        .patch(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: newName, phoneNumber: '(21) 98888-7777' })
        .expect(200)

      expect(body.user.fullName).toBe(newName)
      expect(body.phoneNumber).toBe('(21) 98888-7777')
    })

    it('returns 400 when birthDate is in the future', async () => {
      const { body: created } = await createPatient().expect(201)
      const future = new Date()
      future.setFullYear(future.getFullYear() + 1)

      await request(app.getHttpServer())
        .patch(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ birthDate: future.toISOString().split('T')[0] })
        .expect(400)
    })

    it('response never contains version', async () => {
      const { body: created } = await createPatient().expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: 'Updated' })
        .expect(200)

      expect(body.version).toBeUndefined()
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .patch(`/patients/${faker.string.uuid()}`)
        .send({ fullName: 'Updated' })
        .expect(401)
    })

    it('returns 403 when DOCTOR tries to update', async () => {
      const { body: created } = await createPatient().expect(201)

      await request(app.getHttpServer())
        .patch(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ fullName: 'Updated' })
        .expect(403)
    })

    it('returns 403 when USER tries to update', async () => {
      const { body: created } = await createPatient().expect(201)

      await request(app.getHttpServer())
        .patch(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: 'Updated' })
        .expect(403)
    })

    it('returns 200 updating only patient fields (no user fields)', async () => {
      const { body: created } = await createPatient().expect(201)
      const newPhone = '(21) 98765-4321'

      const { body } = await request(app.getHttpServer())
        .patch(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ phoneNumber: newPhone })
        .expect(200)

      expect(body.phoneNumber).toBe(newPhone)
      expect(body.user.fullName).toBe(created.user.fullName)
    })

    it('returns 200 with no changes when body is empty', async () => {
      const { body: created } = await createPatient().expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.documentNumber).toBe(created.documentNumber)
      expect(body.user.fullName).toBe(created.user.fullName)
    })
  })

  describe('DELETE /patients/:id', () => {
    it('returns 204 on successful soft delete', async () => {
      const { body: created } = await createPatient().expect(201)

      await request(app.getHttpServer())
        .delete(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)
    })

    it('sets deleted_at on the record (soft delete)', async () => {
      const { body: created } = await createPatient().expect(201)

      await request(app.getHttpServer())
        .delete(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const deleted = await patientRepository.findOne({
        where: { id: created.id },
        withDeleted: true,
      })
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('returns 404 when patient does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/patients/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 404 when searching by id after deletion', async () => {
      const { body: created } = await createPatient().expect(201)

      await request(app.getHttpServer())
        .delete(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .get(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 404 when trying to delete an already deleted patient', async () => {
      const { body: created } = await createPatient().expect(201)

      await request(app.getHttpServer())
        .delete(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .delete(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).delete(`/patients/${faker.string.uuid()}`).expect(401)
    })

    it('returns 403 when DOCTOR tries to delete', async () => {
      const { body: created } = await createPatient().expect(201)

      await request(app.getHttpServer())
        .delete(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to delete', async () => {
      const { body: created } = await createPatient().expect(201)

      await request(app.getHttpServer())
        .delete(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })

    it('soft-deletes the linked user when patient is deleted', async () => {
      const { body: created } = await createPatient().expect(201)
      const userId = created.user.id

      await request(app.getHttpServer())
        .delete(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const user = await userRepository.findOne({ where: { id: userId }, withDeleted: true })
      expect(user?.deletedAt).not.toBeNull()
    })

    it('linked user no longer appears in users list after patient deletion', async () => {
      const { body: created } = await createPatient().expect(201)
      const userId = created.user.id

      await request(app.getHttpServer())
        .delete(`/patients/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const { body: usersPage } = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const ids = usersPage.data.map((u: { id: string }) => u.id)
      expect(ids).not.toContain(userId)
    })
  })
})
