import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Doctor } from '../../doctors/entities/doctor.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { User } from '../entities/user.entity'

process.env.NODE_ENV = 'test'
process.env.DB_SCHEMA = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'

describe('UsersController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let doctorRepository: Repository<Doctor>
  let patientRepository: Repository<Patient>
  let specialtyRepository: Repository<Specialty>
  let accessToken: string
  let authUserId: string
  let doctorToken: string
  let doctorUserId: string
  let userToken: string
  let userUserId: string

  async function loginAs(role: UserRole): Promise<{ token: string; id: string }> {
    const password = 'Password123!'
    const hashedPassword = await bcrypt.hash(password, 1)
    const user = await userRepository.save(
      userRepository.create({
        fullName: `Test ${role} User`,
        email: `${role}.${faker.string.alphanumeric(6)}@users.test`,
        password: hashedPassword,
        role,
        isActive: true,
      }),
    )
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password })
    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string | undefined
    if (!setCookieHeader) return { token: '', id: user.id }
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const match = cookies.find((c: string) => c?.startsWith('access_token='))
    const token = match ? match.slice('access_token='.length).split(';')[0] : ''
    return { token, id: user.id }
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
    doctorRepository = module.get(getRepositoryToken(Doctor))
    patientRepository = module.get(getRepositoryToken(Patient))
    specialtyRepository = module.get(getRepositoryToken(Specialty))
  })

  beforeEach(async () => {
    const admin = await loginAs(UserRole.ADMIN)
    accessToken = admin.token
    authUserId = admin.id
    const doctor = await loginAs(UserRole.DOCTOR)
    doctorToken = doctor.token
    doctorUserId = doctor.id
    const user = await loginAs(UserRole.USER)
    userToken = user.token
    userUserId = user.id
  })

  afterEach(async () => {
    await doctorRepository.query('DELETE FROM test.schedules')
    await doctorRepository.query('DELETE FROM test.doctor_specialties')
    await doctorRepository.query('DELETE FROM test.doctors')
    await patientRepository.query('DELETE FROM test.patients')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.users')
  })

  afterAll(async () => {
    await app.close()
  })

  function createUser(overrides: Partial<{ fullName: string; email: string; password: string; role: UserRole }> = {}) {
    return request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        password: 'Password123!',
        ...overrides,
      })
  }

  describe('POST /users', () => {
    it('returns 201 with UserResponseDto on success', async () => {
      const payload = { fullName: faker.person.fullName(), email: faker.internet.email(), password: 'Password123!' }
      const { body } = await createUser(payload).expect(201)

      expect(body.id).toBeDefined()
      expect(body.fullName).toBe(payload.fullName)
      expect(body.email).toBe(payload.email)
      expect(body.role).toBe(UserRole.USER)
      expect(body.createdAt).toBeDefined()
      expect(body.updatedAt).toBeDefined()
    })

    it('response never contains password or version', async () => {
      const { body } = await createUser().expect(201)
      expect(body.password).toBeUndefined()
      expect(body.version).toBeUndefined()
    })

    it('defaults role to USER when not provided', async () => {
      const { body } = await createUser().expect(201)
      expect(body.role).toBe(UserRole.USER)
    })

    it('returns 409 when email is already in use', async () => {
      const email = faker.internet.email()
      await createUser({ email }).expect(201)
      await createUser({ email }).expect(409)
    })

    it('returns 400 when password is too short', async () => {
      await createUser({ password: 'short' }).expect(400)
    })

    it('returns 400 when fullName is too short', async () => {
      await createUser({ fullName: 'AB' }).expect(400)
    })

    it('returns 400 when unknown field is sent', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: faker.person.fullName(), email: faker.internet.email(), password: 'Password123!', isAdmin: true })
        .expect(400)
    })

    it('returns 400 when email is invalid', async () => {
      await createUser({ email: 'not-an-email' }).expect(400)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ fullName: faker.person.fullName(), email: faker.internet.email(), password: 'Password123!' })
        .expect(401)
    })

    it('returns 403 when DOCTOR tries to create', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ fullName: faker.person.fullName(), email: faker.internet.email(), password: 'Password123!' })
        .expect(403)
    })

    it('returns 403 when USER tries to create', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: faker.person.fullName(), email: faker.internet.email(), password: 'Password123!' })
        .expect(403)
    })
  })

  describe('GET /users', () => {
    it('returns 200 with paginated response', async () => {
      await createUser()
      await createUser()

      const { body } = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.data).toBeDefined()
      expect(body.total).toBeGreaterThanOrEqual(2)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
    })

    it('respects pagination parameters', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/users?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.limit).toBe(1)
      expect(body.data.length).toBeLessThanOrEqual(1)
    })

    it('response data never contains password or version', async () => {
      await createUser()

      const { body } = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      body.data.forEach((user: any) => {
        expect(user.password).toBeUndefined()
        expect(user.version).toBeUndefined()
      })
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/users').expect(401)
    })

    it('returns 403 when DOCTOR tries to list', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to list', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })
  })

  describe('GET /users/:id', () => {
    it('returns 200 with UserResponseDto', async () => {
      const { body: created } = await createUser().expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/users/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.email).toBe(created.email)
    })

    it('returns 404 when user does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/users/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('response never contains password or version', async () => {
      const { body: created } = await createUser().expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/users/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.password).toBeUndefined()
      expect(body.version).toBeUndefined()
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get(`/users/${faker.string.uuid()}`).expect(401)
    })

    it('returns 200 when DOCTOR views own profile', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/users/${doctorUserId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.id).toBe(doctorUserId)
    })

    it('returns 403 when DOCTOR tries to view another user profile', async () => {
      const { body: other } = await createUser().expect(201)

      await request(app.getHttpServer())
        .get(`/users/${other.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 200 when USER views own profile', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/users/${userUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(body.id).toBe(userUserId)
    })

    it('returns 403 when USER tries to view another user profile', async () => {
      const { body: other } = await createUser().expect(201)

      await request(app.getHttpServer())
        .get(`/users/${other.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })
  })

  describe('PATCH /users/:id', () => {
    it('returns 200 with updated UserResponseDto', async () => {
      const { body: created } = await createUser().expect(201)
      const newName = faker.person.fullName()

      const { body } = await request(app.getHttpServer())
        .patch(`/users/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: newName })
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.fullName).toBe(newName)
    })

    it('returns 404 when user does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: 'New Name' })
        .expect(404)
    })

    it('returns 409 when new email is already in use by another user', async () => {
      const { body: user1 } = await createUser().expect(201)
      const { body: user2 } = await createUser().expect(201)

      await request(app.getHttpServer())
        .patch(`/users/${user1.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: user2.email })
        .expect(409)
    })

    it('response never contains password or version', async () => {
      const { body: created } = await createUser().expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/users/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: 'Updated' })
        .expect(200)

      expect(body.password).toBeUndefined()
      expect(body.version).toBeUndefined()
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${faker.string.uuid()}`)
        .send({ fullName: 'Updated' })
        .expect(401)
    })

    it('returns 200 when DOCTOR edits own profile', async () => {
      const newName = faker.person.fullName()

      const { body } = await request(app.getHttpServer())
        .patch(`/users/${doctorUserId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ fullName: newName })
        .expect(200)

      expect(body.fullName).toBe(newName)
    })

    it('returns 403 when DOCTOR tries to edit another user', async () => {
      const { body: other } = await createUser().expect(201)

      await request(app.getHttpServer())
        .patch(`/users/${other.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ fullName: 'Hacked' })
        .expect(403)
    })

    it('returns 200 when USER edits own profile', async () => {
      const newName = faker.person.fullName()

      const { body } = await request(app.getHttpServer())
        .patch(`/users/${userUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: newName })
        .expect(200)

      expect(body.fullName).toBe(newName)
    })

    it('returns 403 when USER tries to edit another user', async () => {
      const { body: other } = await createUser().expect(201)

      await request(app.getHttpServer())
        .patch(`/users/${other.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: 'Hacked' })
        .expect(403)
    })

    it('returns 200 when updating email to the same current value (no conflict check)', async () => {
      const { body: created } = await createUser().expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/users/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: created.email })
        .expect(200)

      expect(body.email).toBe(created.email)
    })
  })

  describe('PATCH /users/:id/activate', () => {
    it('returns 200 with isActive true after activation', async () => {
      const { body: created } = await createUser().expect(201)

      await request(app.getHttpServer())
        .patch(`/users/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: false })

      const { body } = await request(app.getHttpServer())
        .patch(`/users/${created.id}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.isActive).toBe(true)
    })

    it('returns 422 when user is already active', async () => {
      const { body: created } = await createUser().expect(201)

      await request(app.getHttpServer())
        .patch(`/users/${created.id}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(422)
    })

    it('returns 404 when user does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${faker.string.uuid()}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('response never contains password or version', async () => {
      const { body: created } = await createUser().expect(201)

      await request(app.getHttpServer())
        .patch(`/users/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: false })

      const { body } = await request(app.getHttpServer())
        .patch(`/users/${created.id}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.password).toBeUndefined()
      expect(body.version).toBeUndefined()
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${faker.string.uuid()}/activate`)
        .expect(401)
    })

    it('returns 403 when DOCTOR tries to activate', async () => {
      const { body: created } = await createUser().expect(201)

      await request(app.getHttpServer())
        .patch(`/users/${created.id}/activate`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to activate', async () => {
      const { body: created } = await createUser().expect(201)

      await request(app.getHttpServer())
        .patch(`/users/${created.id}/activate`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })
  })

  describe('DELETE /users/:id', () => {
    it('returns 204 on successful soft delete', async () => {
      const { body: created } = await createUser().expect(201)

      await request(app.getHttpServer())
        .delete(`/users/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)
    })

    it('sets deleted_at on the record (soft delete)', async () => {
      const { body: created } = await createUser().expect(201)

      await request(app.getHttpServer())
        .delete(`/users/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const deleted = await userRepository.findOne({ where: { id: created.id }, withDeleted: true })
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('returns 404 when user does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 404 when trying to delete an already deleted user', async () => {
      const { body: created } = await createUser().expect(201)

      await request(app.getHttpServer())
        .delete(`/users/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .delete(`/users/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('soft-deletes linked doctor when user is deleted', async () => {
      const { body: targetUser } = await createUser({ role: UserRole.DOCTOR }).expect(201)

      const specialty = await specialtyRepository.save(
        specialtyRepository.create({ name: 'Cardiologia' }),
      )

      const { body: doctor } = await request(app.getHttpServer())
        .post('/doctors')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: targetUser.id, crmNumber: '11111/SP', specialtyIds: [specialty.id] })
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const deletedDoctor = await doctorRepository.findOne({
        where: { id: doctor.id },
        withDeleted: true,
      })
      expect(deletedDoctor?.deletedAt).not.toBeNull()
    })

    it('soft-deletes linked patient when user is deleted', async () => {
      const { body: patient } = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fullName: faker.person.fullName(),
          email: faker.internet.email(),
          documentNumber: '12345678901',
          phoneNumber: '(11) 99999-9999',
          birthDate: '1990-05-15',
          gender: 'male',
        })
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/users/${patient.user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const deletedPatient = await patientRepository.findOne({
        where: { id: patient.id },
        withDeleted: true,
      })
      expect(deletedPatient?.deletedAt).not.toBeNull()
    })

    it('deletes user without error when no doctor or patient is linked', async () => {
      const { body: created } = await createUser().expect(201)

      await request(app.getHttpServer())
        .delete(`/users/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const deleted = await userRepository.findOne({ where: { id: created.id }, withDeleted: true })
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('returns 403 when admin tries to delete own account', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${authUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).delete(`/users/${faker.string.uuid()}`).expect(401)
    })

    it('returns 403 when DOCTOR tries to delete', async () => {
      const { body: created } = await createUser().expect(201)

      await request(app.getHttpServer())
        .delete(`/users/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to delete', async () => {
      const { body: created } = await createUser().expect(201)

      await request(app.getHttpServer())
        .delete(`/users/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })
  })
})
