import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtAuthGuard } from './jwt-auth.guard'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

function makeContext(handlerMeta: boolean | undefined, classMeta: boolean | undefined): ExecutionContext {
  return {
    getHandler: jest.fn().mockReturnValue('handler'),
    getClass: jest.fn().mockReturnValue('class'),
  } as unknown as ExecutionContext
}

describe('JwtAuthGuard', () => {
  let reflector: jest.Mocked<Reflector>
  let guard: JwtAuthGuard

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>
    guard = new JwtAuthGuard(reflector)
  })

  it('returns true when handler is marked @Public()', () => {
    reflector.getAllAndOverride.mockReturnValue(true)
    const context = makeContext(true, undefined)
    expect(guard.canActivate(context)).toBe(true)
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      expect.anything(),
      expect.anything(),
    ])
  })

  it('returns true when class is marked @Public()', () => {
    reflector.getAllAndOverride.mockReturnValue(true)
    expect(guard.canActivate(makeContext(undefined, true))).toBe(true)
  })

  it('delegates to super.canActivate when route is not public', () => {
    reflector.getAllAndOverride.mockReturnValue(false)
    const superCanActivate = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockReturnValue(true)
    const context = makeContext(undefined, undefined)
    guard.canActivate(context)
    expect(superCanActivate).toHaveBeenCalledWith(context)
    superCanActivate.mockRestore()
  })

  it('delegates to super.canActivate when isPublic is undefined', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined)
    const superCanActivate = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockReturnValue(true)
    guard.canActivate(makeContext(undefined, undefined))
    expect(superCanActivate).toHaveBeenCalled()
    superCanActivate.mockRestore()
  })
})
