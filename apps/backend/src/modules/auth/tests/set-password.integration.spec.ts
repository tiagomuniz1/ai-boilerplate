import { INestApplication, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import { createHash } from 'crypto'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { PasswordSetToken } from '../entities/password-set-token.entity'

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

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

describe('AuthController — set-password (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let tokenRepository: Repository<PasswordSetToken>

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
    clinicRepository = module.get(getRepositoryToken(Clinic))
    tokenRepository = module.get(getRepositoryToken(PasswordSetToken))
  })

  beforeAll(async () => {
    await clinicRepository.save(
      clinicRepository.create({
        id: SEED_CLINIC_ID,
        name: 'Test Clinic',
        slug: 'test-clinic',
      }),
    )
  })

  afterEach(async () => {
    await tokenRepository.query('DELETE FROM test.password_set_tokens')
    await userRepository.query('DELETE FROM test.users WHERE clinic_id = $1', [SEED_CLINIC_ID])
  })

  afterAll(async () => {
    await clinicRepository.query('DELETE FROM test.clinics WHERE id = $1', [SEED_CLINIC_ID])
    await app.close()
  })

  async function createUserAndToken(overrides: {
    usedAt?: Date
    expiresAt?: Date
  } = {}) {
    const user = await userRepository.save(
      userRepository.create({
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        password: await bcrypt.hash('oldpassword', 10),
        role: 'doctor' as any,
        isActive: true,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const plainToken = faker.string.alphanumeric(64)
    await tokenRepository.save(
      tokenRepository.create({
        userId: user.id,
        clinicId: SEED_CLINIC_ID,
        tokenHash: hashToken(plainToken),
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 72 * 60 * 60 * 1000),
        usedAt: overrides.usedAt ?? null,
      }),
    )

    return { user, plainToken }
  }

  describe('GET /auth/set-password/validate', () => {
    it('returns { valid: true, email } for a valid token', async () => {
      const { user, plainToken } = await createUserAndToken()

      const { body } = await request(app.getHttpServer())
        .get(`/auth/set-password/validate?token=${plainToken}`)
        .expect(200)

      expect(body.valid).toBe(true)
      expect(body.email).toBe(user.email)
    })

    it('returns { valid: false } for unknown token', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/auth/set-password/validate?token=unknowntoken123')
        .expect(200)

      expect(body.valid).toBe(false)
      expect(body.email).toBeNull()
    })

    it('returns { valid: false } for expired token', async () => {
      const { plainToken } = await createUserAndToken({
        expiresAt: new Date(Date.now() - 1000),
      })

      const { body } = await request(app.getHttpServer())
        .get(`/auth/set-password/validate?token=${plainToken}`)
        .expect(200)

      expect(body.valid).toBe(false)
    })

    it('returns { valid: false } for already used token', async () => {
      const { plainToken } = await createUserAndToken({ usedAt: new Date() })

      const { body } = await request(app.getHttpServer())
        .get(`/auth/set-password/validate?token=${plainToken}`)
        .expect(200)

      expect(body.valid).toBe(false)
    })

    it('returns 400 when token query param is missing', async () => {
      await request(app.getHttpServer())
        .get('/auth/set-password/validate')
        .expect(400)
    })
  })

  describe('POST /auth/set-password', () => {
    it('updates password, marks token as used and returns 204', async () => {
      const { user, plainToken } = await createUserAndToken()

      await request(app.getHttpServer())
        .post('/auth/set-password')
        .send({ token: plainToken, password: 'newpassword123' })
        .expect(204)

      const updatedUser = await userRepository.findOneByOrFail({ id: user.id })
      const passwordValid = await bcrypt.compare('newpassword123', updatedUser.password)
      expect(passwordValid).toBe(true)

      const record = await tokenRepository.findOneBy({ tokenHash: hashToken(plainToken) })
      expect(record?.usedAt).not.toBeNull()
    })

    it('allows login with new password after setting it', async () => {
      const { user, plainToken } = await createUserAndToken()

      await request(app.getHttpServer())
        .post('/auth/set-password')
        .send({ token: plainToken, password: 'mynewpass456' })
        .expect(204)

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'mynewpass456', slug: 'test-clinic' })
        .expect(200)
    })

    it('returns 422 when token is already used', async () => {
      const { plainToken } = await createUserAndToken({ usedAt: new Date() })

      await request(app.getHttpServer())
        .post('/auth/set-password')
        .send({ token: plainToken, password: 'newpassword123' })
        .expect(422)
    })

    it('returns 422 when token is expired', async () => {
      const { plainToken } = await createUserAndToken({
        expiresAt: new Date(Date.now() - 1000),
      })

      await request(app.getHttpServer())
        .post('/auth/set-password')
        .send({ token: plainToken, password: 'newpassword123' })
        .expect(422)
    })

    it('returns 404 when token does not exist', async () => {
      await request(app.getHttpServer())
        .post('/auth/set-password')
        .send({ token: 'nonexistenttoken', password: 'newpassword123' })
        .expect(404)
    })

    it('returns 400 when password is shorter than 8 characters', async () => {
      const { plainToken } = await createUserAndToken()

      await request(app.getHttpServer())
        .post('/auth/set-password')
        .send({ token: plainToken, password: 'short' })
        .expect(400)
    })

    it('returns 400 when token field is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/set-password')
        .send({ password: 'newpassword123' })
        .expect(400)
    })

    it('second use of same token returns 422 (use-once)', async () => {
      const { plainToken } = await createUserAndToken()

      await request(app.getHttpServer())
        .post('/auth/set-password')
        .send({ token: plainToken, password: 'firstpassword' })
        .expect(204)

      await request(app.getHttpServer())
        .post('/auth/set-password')
        .send({ token: plainToken, password: 'secondattempt' })
        .expect(422)
    })
  })
})
