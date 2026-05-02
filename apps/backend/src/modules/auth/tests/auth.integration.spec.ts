import { INestApplication, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { AppModule } from '../../../app.module'
import { User } from '../../users/entities/user.entity'
import { RefreshToken } from '../entities/refresh-token.entity'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { createHash } from 'crypto'

process.env.NODE_ENV = 'test'
process.env.DB_SCHEMA = 'test'
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
  let refreshTokenRepository: Repository<RefreshToken>

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
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken))
  })

  afterEach(async () => {
    await refreshTokenRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
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
      }),
    )
  }

  async function loginAndExtractTokens(email: string, password = 'password123') {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
    const cookies = response.headers['set-cookie'] as unknown as string[]
    return {
      accessToken: extractCookieValue(cookies, 'access_token'),
      refreshToken: extractCookieValue(cookies, 'refresh_token'),
    }
  }

  describe('POST /auth/login', () => {
    it('returns 200 with { id, fullName, email } body and sets httpOnly cookies on valid credentials', async () => {
      const user = await createTestUser()

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'password123' })
        .expect(200)

      expect(response.body).toMatchObject({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      })
      expect(response.body).not.toHaveProperty('accessToken')
      expect(response.body).not.toHaveProperty('refreshToken')
      expect(response.body).not.toHaveProperty('expiresIn')

      const cookies = response.headers['set-cookie'] as unknown as string[]
      const accessTokenCookie = cookies.find((c) => c.startsWith('access_token='))
      const refreshTokenCookie = cookies.find((c) => c.startsWith('refresh_token='))

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
        .send({ email: user.email, password: 'password123' })
        .expect(200)

      const cookies = response.headers['set-cookie'] as unknown as string[]
      const refreshToken = extractCookieValue(cookies, 'refresh_token')

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
        .send({ email: user.email, password: 'wrongpassword' })
        .expect(401)

      expect(body.detail).toBe('Invalid credentials')
    })

    it('error message is identical for missing email and wrong password', async () => {
      const user = await createTestUser()

      const { body: body1 } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: faker.internet.email(), password: 'password123' })
        .expect(401)

      const { body: body2 } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'wrongpassword' })
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

    it('is accessible without authentication (public route)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: faker.internet.email(), password: 'password123' })
        .expect(401)
    })
  })

  describe('POST /auth/refresh', () => {
    it('returns 200 with new token pair on valid refresh token', async () => {
      const user = await createTestUser()
      const { refreshToken } = await loginAndExtractTokens(user.email)

      const { body } = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(body.accessToken).toBeDefined()
      expect(body.refreshToken).toBeDefined()
      expect(body.refreshToken).not.toBe(refreshToken)
    })

    it('revokes old refresh token after rotation', async () => {
      const user = await createTestUser()
      const { refreshToken } = await loginAndExtractTokens(user.email)

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      const oldHash = createHash('sha256').update(refreshToken).digest('hex')
      const oldStored = await refreshTokenRepository.findOneBy({ tokenHash: oldHash })
      expect(oldStored!.revokedAt).not.toBeNull()
    })

    it('returns 401 on reuse of revoked refresh token', async () => {
      const user = await createTestUser()
      const { refreshToken } = await loginAndExtractTokens(user.email)

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401)
    })

    it('returns 401 on malformed/invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'not.a.valid.jwt' })
        .expect(401)
    })

    it('returns 401 when token is not found in database', async () => {
      const user = await createTestUser()
      const { refreshToken } = await loginAndExtractTokens(user.email)

      await refreshTokenRepository.query('DELETE FROM test.refresh_tokens')

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
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
        .send({ refreshToken })
        .expect(204)

      const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
      const stored = await refreshTokenRepository.findOneBy({ tokenHash })
      expect(stored!.revokedAt).not.toBeNull()
    })

    it('returns 204 on already revoked token (idempotent)', async () => {
      const user = await createTestUser()
      const { accessToken, refreshToken } = await loginAndExtractTokens(user.email)

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204)

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204)
    })

    it('returns 204 on nonexistent token (idempotent)', async () => {
      const user = await createTestUser()
      const { accessToken } = await loginAndExtractTokens(user.email)

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken: 'nonexistent-token' })
        .expect(204)
    })

    it('refresh fails after logout', async () => {
      const user = await createTestUser()
      const { accessToken, refreshToken } = await loginAndExtractTokens(user.email)

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401)
    })
  })

  describe('JWT Guard', () => {
    it('returns 401 on protected endpoint without token', async () => {
      await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken: 'token' }).expect(401)
    })

    it('health endpoint is accessible without authentication', async () => {
      await request(app.getHttpServer()).get('/health').expect(200)
    })
  })
})
