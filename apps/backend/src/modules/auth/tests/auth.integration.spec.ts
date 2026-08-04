import { INestApplication, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as cookieParser from 'cookie-parser'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { RefreshToken } from '../entities/refresh-token.entity'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { ICaptchaAdapter } from '../adapters/captcha.adapter.interface'
import { CAPTCHA_FAILED_ATTEMPTS_THRESHOLD } from '../constants/captcha.constants'
import { createHash } from 'crypto'

const mockCaptchaAdapter: jest.Mocked<ICaptchaAdapter> = {
  verify: jest.fn(),
}

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

function extractCookieValue(setCookieHeaders: string[] | string | undefined, name: string): string {
  if (!setCookieHeaders) return ''
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders]
  const header = headers.find((h) => h.startsWith(`${name}=`))
  if (!header) return ''
  return header.slice(name.length + 1).split(';')[0]
}

describe('AuthController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let refreshTokenRepository: Repository<RefreshToken>

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_GUARD)
      .useClass(JwtAuthGuard)
      .overrideProvider(ICaptchaAdapter)
      .useValue(mockCaptchaAdapter)
      .compile()

    app = module.createNestApplication()
    app.use(cookieParser())
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.listen(0)

    userRepository = module.get(getRepositoryToken(User))
    clinicRepository = module.get(getRepositoryToken(Clinic))
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken))
  })

  beforeEach(async () => {
    await clinicRepository.save(
      clinicRepository.create({ id: SEED_CLINIC_ID, name: 'Seed Clinic', slug: 'seed-clinic', isActive: true }),
    )
  })

  afterEach(async () => {
    await refreshTokenRepository.query('DELETE FROM test.schedules')
    await refreshTokenRepository.query('DELETE FROM test.professional_specialties')
    await refreshTokenRepository.query('DELETE FROM test.professionals')
    await refreshTokenRepository.query('DELETE FROM test.patients')
    await refreshTokenRepository.query('DELETE FROM test.specialties')
    await refreshTokenRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
  })

  afterAll(async () => {
    await app.close()
  })

  async function createTestUser(password = 'password123') {
    const hashedPassword = await bcrypt.hash(password, 10)
    return userRepository.save(
      userRepository.create({
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        password: hashedPassword,
        clinicId: SEED_CLINIC_ID,
      }),
    )
  }

  async function loginAndExtractTokens(email: string, password = 'password123') {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password, slug: 'seed-clinic' })
    const cookies = response.headers['set-cookie'] as unknown as string[]
    return {
      accessToken: extractCookieValue(cookies, 'access_token_seed-clinic'),
      refreshToken: extractCookieValue(cookies, 'refresh_token_seed-clinic'),
    }
  }

  describe('POST /auth/login', () => {
    it('returns 200 with { id, fullName, email, role } body and sets httpOnly cookies on valid credentials', async () => {
      const user = await createTestUser()

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'password123', slug: 'seed-clinic' })
        .expect(200)

      expect(response.body).toMatchObject({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      })
      expect(response.body).not.toHaveProperty('accessToken')
      expect(response.body).not.toHaveProperty('refreshToken')
      expect(response.body).not.toHaveProperty('expiresIn')

      const cookies = response.headers['set-cookie'] as unknown as string[]
      const accessTokenCookie = cookies.find((c) => c.startsWith('access_token_seed-clinic='))
      const refreshTokenCookie = cookies.find((c) => c.startsWith('refresh_token_seed-clinic='))

      expect(accessTokenCookie).toBeDefined()
      expect(accessTokenCookie).toContain('HttpOnly')
      expect(accessTokenCookie).toContain('Secure')
      expect(accessTokenCookie).toContain('SameSite=Strict')

      expect(refreshTokenCookie).toBeDefined()
      expect(refreshTokenCookie).toContain('HttpOnly')
      expect(refreshTokenCookie).toContain('Secure')
      expect(refreshTokenCookie).toContain('SameSite=Strict')
    })

    it('stores refresh token as hash (not plaintext) in the database', async () => {
      const user = await createTestUser()

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'password123', slug: 'seed-clinic' })
        .expect(200)

      const cookies = response.headers['set-cookie'] as unknown as string[]
      const refreshToken = extractCookieValue(cookies, 'refresh_token_seed-clinic')

      const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
      const stored = await refreshTokenRepository.findOneBy({ tokenHash })

      expect(stored).not.toBeNull()
      expect(stored!.tokenHash).toBe(tokenHash)
      expect(stored!.tokenHash).not.toBe(refreshToken)
    })

    it('returns 401 with generic message when email is not registered', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: faker.internet.email(), password: 'password123' })
        .expect(401)

      expect(body.detail).toBe('Invalid credentials')
    })

    it('returns 401 with generic message when password is incorrect', async () => {
      const user = await createTestUser()

      const { body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'wrongpassword', slug: 'seed-clinic' })
        .expect(401)

      expect(body.detail).toBe('Invalid credentials')
    })

    it('error message is identical for missing email and wrong password', async () => {
      const user = await createTestUser()

      const { body: body1 } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: faker.internet.email(), password: 'password123', slug: 'seed-clinic' })
        .expect(401)

      const { body: body2 } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'wrongpassword', slug: 'seed-clinic' })
        .expect(401)

      expect(body1.detail).toBe(body2.detail)
    })

    it('returns 400 on invalid DTO (malformed email)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400)
    })

    it('returns 400 on invalid DTO (password too short)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: faker.internet.email(), password: 'short' })
        .expect(400)
    })

    it('returns 401 with generic message when PATIENT role tries to login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10)
      const patient = await userRepository.save(
        userRepository.create({
          fullName: faker.person.fullName(),
          email: faker.internet.email(),
          password: hashedPassword,
          role: UserRole.PATIENT,
          isActive: true,
          clinicId: SEED_CLINIC_ID,
        }),
      )

      const { body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: patient.email, password: 'password123', slug: 'seed-clinic' })
        .expect(401)

      expect(body.detail).toBe('Invalid credentials')
    })

    it('returns 401 when account is inactive', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10)
      await userRepository.save(
        userRepository.create({
          fullName: faker.person.fullName(),
          email: 'inactive@test.com',
          password: hashedPassword,
          isActive: false,
          clinicId: SEED_CLINIC_ID,
        }),
      )

      const { body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'inactive@test.com', password: 'password123', slug: 'seed-clinic' })
        .expect(401)

      expect(body.detail).toBe('Account is not active')
    })

    it('is accessible without authentication (public route)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: faker.internet.email(), password: 'password123' })
        .expect(401)
    })

    describe('captcha (3rd failed attempt onward)', () => {
      it('does not require captcha for the first failed attempt', async () => {
        const user = await createTestUser()

        const { body } = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: 'wrongpassword', slug: 'seed-clinic' })
          .expect(401)

        expect(body.requiresCaptcha).toBeUndefined()
      })

      it('signals requiresCaptcha once the 2nd failed attempt crosses the threshold', async () => {
        const user = await createTestUser()
        expect(CAPTCHA_FAILED_ATTEMPTS_THRESHOLD).toBe(2)

        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: 'wrongpassword', slug: 'seed-clinic' })
          .expect(401)

        const { body } = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: 'wrongpassword', slug: 'seed-clinic' })
          .expect(401)

        expect(body.requiresCaptcha).toBe(true)
      })

      it('rejects the 3rd attempt without a captcha token, without checking credentials', async () => {
        const user = await createTestUser()

        for (let i = 0; i < CAPTCHA_FAILED_ATTEMPTS_THRESHOLD; i++) {
          await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: user.email, password: 'wrongpassword', slug: 'seed-clinic' })
        }

        // Even with the CORRECT password, no token means the captcha gate blocks first.
        const { body } = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: 'password123', slug: 'seed-clinic' })
          .expect(401)

        expect(body.requiresCaptcha).toBe(true)
        expect(mockCaptchaAdapter.verify).not.toHaveBeenCalled()
      })

      it('rejects the 3rd attempt when the captcha token fails verification', async () => {
        const user = await createTestUser()
        mockCaptchaAdapter.verify.mockResolvedValue(false)

        for (let i = 0; i < CAPTCHA_FAILED_ATTEMPTS_THRESHOLD; i++) {
          await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: user.email, password: 'wrongpassword', slug: 'seed-clinic' })
        }

        const { body } = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: 'password123', slug: 'seed-clinic', captchaToken: 'bad-token' })
          .expect(401)

        expect(body.requiresCaptcha).toBe(true)
      })

      it('succeeds on the 3rd attempt with a valid captcha token and correct credentials', async () => {
        const user = await createTestUser()
        mockCaptchaAdapter.verify.mockResolvedValue(true)

        for (let i = 0; i < CAPTCHA_FAILED_ATTEMPTS_THRESHOLD; i++) {
          await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: user.email, password: 'wrongpassword', slug: 'seed-clinic' })
        }

        const { body } = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: 'password123', slug: 'seed-clinic', captchaToken: 'good-token' })
          .expect(200)

        expect(body.id).toBe(user.id)
        expect(mockCaptchaAdapter.verify).toHaveBeenCalledWith('good-token')
      })

      it('clears the failed-attempt counter on successful login', async () => {
        const user = await createTestUser()

        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: 'wrongpassword', slug: 'seed-clinic' })
          .expect(401)

        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: 'password123', slug: 'seed-clinic' })
          .expect(200)

        // Counter reset — a fresh wrong attempt afterwards should not require captcha yet.
        const { body } = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: 'wrongpassword', slug: 'seed-clinic' })
          .expect(401)

        expect(body.requiresCaptcha).toBeUndefined()
      })

      it('keeps backoffice and clinic attempt counters independent for the same email', async () => {
        const hashedPassword = await bcrypt.hash('password123', 10)
        const platformAdmin = await userRepository.save(
          userRepository.create({
            fullName: faker.person.fullName(),
            email: faker.internet.email(),
            password: hashedPassword,
            role: UserRole.PLATFORM_ADMIN,
            isActive: true,
            clinicId: null,
          }),
        )

        for (let i = 0; i < CAPTCHA_FAILED_ATTEMPTS_THRESHOLD; i++) {
          await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: platformAdmin.email, password: 'wrongpassword' })
        }

        // Same email, but a clinic login — must not inherit the backoffice counter.
        const { body } = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: platformAdmin.email, password: 'wrongpassword', slug: 'seed-clinic' })
          .expect(401)

        expect(body.requiresCaptcha).toBeUndefined()
      })
    })
  })

  describe('POST /auth/refresh', () => {
    it('returns 204 and sets new access_token and refresh_token cookies on valid cookie', async () => {
      const user = await createTestUser()
      const { refreshToken } = await loginAndExtractTokens(user.email)

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(204)

      const cookies = response.headers['set-cookie'] as unknown as string[]
      const newAccessCookie = cookies.find((c) => c.startsWith('access_token='))
      const newRefreshCookie = cookies.find((c) => c.startsWith('refresh_token='))

      expect(newAccessCookie).toBeDefined()
      expect(newRefreshCookie).toBeDefined()
      expect(extractCookieValue(cookies, 'refresh_token')).not.toBe(refreshToken)
    })

    it('revokes old refresh token after rotation', async () => {
      const user = await createTestUser()
      const { refreshToken } = await loginAndExtractTokens(user.email)

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(204)

      const oldHash = createHash('sha256').update(refreshToken).digest('hex')
      const oldStored = await refreshTokenRepository.findOneBy({ tokenHash: oldHash })
      expect(oldStored!.revokedAt).not.toBeNull()
    })

    it('returns 401 on reuse of revoked refresh token', async () => {
      const user = await createTestUser()
      const { refreshToken } = await loginAndExtractTokens(user.email)

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(401)
    })

    it('returns 401 on malformed/invalid refresh token in cookie', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=not.a.valid.jwt')
        .expect(401)
    })

    it('returns 401 when no refresh_token cookie is present', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(401)
    })

    it('returns 401 when token is not found in database', async () => {
      const user = await createTestUser()
      const { refreshToken } = await loginAndExtractTokens(user.email)

      await refreshTokenRepository.query('DELETE FROM test.refresh_tokens')

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(401)
    })

    it('returns 401 when the user associated with the token has been deleted', async () => {
      const user = await createTestUser()
      const { refreshToken } = await loginAndExtractTokens(user.email)

      await userRepository.softDelete(user.id)

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(401)
    })
  })

  describe('POST /auth/logout', () => {
    it('returns 204 and revokes refresh token', async () => {
      const user = await createTestUser()
      const { accessToken, refreshToken } = await loginAndExtractTokens(user.email)

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(204)

      const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
      const stored = await refreshTokenRepository.findOneBy({ tokenHash })
      expect(stored!.revokedAt).not.toBeNull()
    })

    it('clears access_token and refresh_token cookies in response', async () => {
      const user = await createTestUser()
      const { accessToken, refreshToken } = await loginAndExtractTokens(user.email)

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(204)

      const cookies = response.headers['set-cookie'] as unknown as string[]
      const clearedAccessToken = cookies?.find((c) => c.startsWith('access_token='))
      const clearedRefreshToken = cookies?.find((c) => c.startsWith('refresh_token='))

      expect(clearedAccessToken).toBeDefined()
      expect(clearedRefreshToken).toBeDefined()
    })

    it('returns 204 on already revoked token (idempotent)', async () => {
      const user = await createTestUser()
      const { accessToken, refreshToken } = await loginAndExtractTokens(user.email)

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(204)
    })

    it('returns 204 without refresh_token cookie (idempotent)', async () => {
      const user = await createTestUser()
      const { accessToken } = await loginAndExtractTokens(user.email)

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)
    })

    it('refresh fails after logout', async () => {
      const user = await createTestUser()
      const { accessToken, refreshToken } = await loginAndExtractTokens(user.email)

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', `refresh_token=${refreshToken}`)

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401)
    })
  })

  describe('GET /auth/me', () => {
    it('returns 200 with current user profile when authenticated', async () => {
      const user = await createTestUser()
      const { accessToken } = await loginAndExtractTokens(user.email)

      const { body } = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.id).toBe(user.id)
      expect(body.fullName).toBe(user.fullName)
      expect(body.email).toBe(user.email)
      expect(body.role).toBe(user.role)
      expect(body.clinicId).toBe(SEED_CLINIC_ID)
    })

    it('response does not contain password or version', async () => {
      const user = await createTestUser()
      const { accessToken } = await loginAndExtractTokens(user.email)

      const { body } = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.password).toBeUndefined()
      expect(body.version).toBeUndefined()
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401)
    })
  })

  describe('JWT Guard', () => {
    it('returns 401 on protected endpoint without token', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401)
    })

    it('health endpoint is accessible without authentication', async () => {
      await request(app.getHttpServer()).get('/health').expect(200)
    })
  })
})
