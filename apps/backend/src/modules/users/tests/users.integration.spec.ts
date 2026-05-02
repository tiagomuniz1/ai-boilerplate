import { INestApplication, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { User } from '../entities/user.entity'

process.env.NODE_ENV = 'test'
process.env.DB_SCHEMA = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'

describe('UsersController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let accessToken: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_GUARD)
      .useClass(JwtAuthGuard)
      .compile()

    app = module.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.init()

    userRepository = module.get(getRepositoryToken(User))
  })

  beforeEach(async () => {
    const password = 'Password123!'
    const hashedPassword = await bcrypt.hash(password, 1)
    const authUser = await userRepository.save(
      userRepository.create({
        fullName: 'Test Auth User',
        email: 'auth@test.com',
        password: hashedPassword,
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: authUser.email, password })

    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const match = cookies.find((c) => c.startsWith('access_token='))
    accessToken = match ? match.slice('access_token='.length).split(';')[0] : ''
  })

  afterEach(async () => {
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
  })

  describe('JWT Guard', () => {
    it('returns 401 on protected endpoint without token', async () => {
      await request(app.getHttpServer()).get('/users').expect(401)
    })
  })
})
