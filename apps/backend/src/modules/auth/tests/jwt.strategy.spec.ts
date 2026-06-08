import { UnauthorizedException } from '@nestjs/common'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { JwtStrategy } from '../strategies/jwt.strategy'
import type { JwtPayload } from '../strategies/jwt.strategy'

jest.mock('../../../config/env.config', () => ({
  getEnvConfig: () => ({ JWT_SECRET: 'test-secret' }),
}))

function makePayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: faker.string.uuid(),
    email: faker.internet.email(),
    role: UserRole.USER,
    clinicId: faker.string.uuid(),
    iat: 0,
    exp: 9999999999,
    ...overrides,
  }
}

describe('JwtStrategy', () => {
  let strategy: JwtStrategy

  beforeEach(() => {
    strategy = new JwtStrategy()
  })

  it('returns ICurrentUser with id, role, and clinicId from payload', () => {
    const payload = makePayload({ role: UserRole.ADMIN })

    const result = strategy.validate(payload)

    expect(result).toEqual({
      id: payload.sub,
      role: payload.role,
      clinicId: payload.clinicId,
    })
  })

  it('defaults role to USER when role is absent from payload', () => {
    const payload = makePayload({ role: undefined })

    const result = strategy.validate(payload)

    expect(result.role).toBe(UserRole.USER)
  })

  it('throws UnauthorizedException when clinicId is absent from payload', () => {
    const payload = makePayload({ clinicId: undefined as any })

    expect(() => strategy.validate(payload)).toThrow(UnauthorizedException)
  })

  it('does not include email in the returned object', () => {
    const payload = makePayload()

    const result = strategy.validate(payload)

    expect(result).not.toHaveProperty('email')
  })
})
