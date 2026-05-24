import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from '@app/shared'
import { RolesGuard } from './roles.guard'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

function makeContext(user: { role: UserRole } | null, metadata: Record<string, unknown> = {}) {
  const reflector = new Reflector()
  jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => metadata[key as string])

  const guard = new RolesGuard(reflector)
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any

  return { guard, context }
}

describe('RolesGuard', () => {
  it('allows public routes regardless of roles', () => {
    const { guard, context } = makeContext(null, { [IS_PUBLIC_KEY]: true })
    expect(guard.canActivate(context)).toBe(true)
  })

  it('allows when no roles are specified', () => {
    const { guard, context } = makeContext({ role: UserRole.USER }, { [ROLES_KEY]: undefined })
    expect(guard.canActivate(context)).toBe(true)
  })

  it('allows when user role is in the required roles list', () => {
    const { guard, context } = makeContext(
      { role: UserRole.ADMIN },
      { [ROLES_KEY]: [UserRole.ADMIN, UserRole.DOCTOR] },
    )
    expect(guard.canActivate(context)).toBe(true)
  })

  it('throws ForbiddenException when user role is not in required roles', () => {
    const { guard, context } = makeContext(
      { role: UserRole.USER },
      { [ROLES_KEY]: [UserRole.ADMIN, UserRole.DOCTOR] },
    )
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when user is null', () => {
    const { guard, context } = makeContext(null, { [ROLES_KEY]: [UserRole.ADMIN] })
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })

  it('throws ForbiddenException for PATIENT on any restricted route', () => {
    const { guard, context } = makeContext(
      { role: UserRole.PATIENT },
      { [ROLES_KEY]: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER] },
    )
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })
})
