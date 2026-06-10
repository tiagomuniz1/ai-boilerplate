import { UnauthorizedException } from '@nestjs/common'
import { ExtractJwt } from 'passport-jwt'
import type { Request } from 'express'
import { UserRole } from '@app/shared'
import { JwtStrategy, JwtPayload } from './jwt.strategy'

const requiredEnv = {
  DB_HOST: 'localhost', DB_PORT: '5499', DB_USER: 'postgres',
  DB_PASS: 'postgres', DB_NAME: 'app', DB_SCHEMA: 'dev',
  REDIS_HOST: 'localhost', REDIS_PORT: '6379',
  JWT_SECRET: 'test-secret', JWT_EXPIRATION: '900s',
  JWT_REFRESH_EXPIRATION: '7d', FRONTEND_URL: 'http://localhost:3000',
}

beforeAll(() => { Object.assign(process.env, requiredEnv) })

describe('JwtStrategy', () => {
  describe('validate', () => {
    let strategy: JwtStrategy

    beforeEach(() => { strategy = new JwtStrategy() })

    it('returns ICurrentUser with id, role, and clinicId from payload', () => {
      const payload: JwtPayload = {
        sub: 'user-uuid',
        email: 'user@example.com',
        role: UserRole.DOCTOR,
        clinicId: 'clinic-uuid',
        iat: 0,
        exp: 9999999999,
      }
      expect(strategy.validate(payload)).toEqual({
        id: 'user-uuid',
        role: UserRole.DOCTOR,
        clinicId: 'clinic-uuid',
      })
    })

    it('defaults role to USER when role is absent in payload', () => {
      const payload: JwtPayload = {
        sub: 'user-uuid',
        email: 'user@example.com',
        clinicId: 'clinic-uuid',
        iat: 0,
        exp: 9999999999,
      }
      expect(strategy.validate(payload)).toEqual({
        id: 'user-uuid',
        role: UserRole.USER,
        clinicId: 'clinic-uuid',
      })
    })

    it('throws UnauthorizedException when clinicId is absent and role is not PLATFORM_ADMIN', () => {
      const payload = {
        sub: 'user-uuid',
        email: 'user@example.com',
        role: UserRole.ADMIN,
        iat: 0,
        exp: 9999999999,
      } as unknown as JwtPayload

      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException)
    })

    it('allows null clinicId for PLATFORM_ADMIN', () => {
      const payload: JwtPayload = {
        sub: 'platform-admin-uuid',
        email: 'platform@umi.dev',
        role: UserRole.PLATFORM_ADMIN,
        clinicId: null,
        iat: 0,
        exp: 9999999999,
      }

      expect(strategy.validate(payload)).toEqual({
        id: 'platform-admin-uuid',
        role: UserRole.PLATFORM_ADMIN,
        clinicId: null,
      })
    })

    it('does not include email in the returned object', () => {
      const payload: JwtPayload = {
        sub: 'user-uuid',
        email: 'user@example.com',
        clinicId: 'clinic-uuid',
        iat: 0,
        exp: 9999999999,
      }
      const result = strategy.validate(payload)
      expect(result).not.toHaveProperty('email')
    })
  })

  describe('cookie extractor', () => {
    let cookieExtractor: (req: Request) => string | null

    beforeEach(() => {
      const spy = jest.spyOn(ExtractJwt, 'fromExtractors').mockImplementation((fns) => {
        cookieExtractor = fns[0] as (req: Request) => string | null
        return jest.fn() as ReturnType<typeof ExtractJwt.fromExtractors>
      })
      new JwtStrategy()
      spy.mockRestore()
    })

    it('returns the access_token cookie when present', () => {
      const req = { cookies: { access_token: 'my-token' } } as unknown as Request
      expect(cookieExtractor(req)).toBe('my-token')
    })

    it('returns null when access_token cookie is absent', () => {
      const req = { cookies: {} } as unknown as Request
      expect(cookieExtractor(req)).toBeNull()
    })

    it('returns null when cookies is undefined', () => {
      const req = {} as unknown as Request
      expect(cookieExtractor(req)).toBeNull()
    })

    it('returns null when request is null', () => {
      expect(cookieExtractor(null as unknown as Request)).toBeNull()
    })
  })
})
