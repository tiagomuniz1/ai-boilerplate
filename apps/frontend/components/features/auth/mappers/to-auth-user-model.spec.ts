import { toAuthUserModel } from './to-auth-user-model'

describe('toAuthUserModel', () => {
  it('maps IAuthUserDto to IAuthUserModel', () => {
    const dto = { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' }
    expect(toAuthUserModel(dto)).toEqual({
      id: 'uuid-1',
      fullName: 'Alice Costa',
      email: 'alice@example.com',
    })
  })
})
