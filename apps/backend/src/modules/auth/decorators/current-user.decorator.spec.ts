import { ExecutionContext } from '@nestjs/common'

describe('CurrentUser decorator factory', () => {
  it('returns request.user from context', () => {
    const user = { userId: 'uuid', email: 'a@b.com' }
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext

    // Import the factory function directly (the callback passed to createParamDecorator)
    // We test by dynamically requiring the module and exercising the factory
    jest.resetModules()
    const createParamDecoratorMock = jest.fn((factory) => factory)
    jest.doMock('@nestjs/common', () => ({
      ...jest.requireActual('@nestjs/common'),
      createParamDecorator: createParamDecoratorMock,
    }))

    const { CurrentUser } = require('./current-user.decorator')
    const result = CurrentUser(undefined, context)

    expect(result).toBe(user)
  })
})
