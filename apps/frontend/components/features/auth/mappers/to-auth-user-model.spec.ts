import { UserRole } from '@app/shared'
import { toAuthUserModel } from './to-auth-user-model'

describe('toAuthUserModel', () => {
  it('maps IAuthUserDto to IAuthUserModel including role', () => {
    const dto = { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com', role: UserRole.DOCTOR }
    expect(toAuthUserModel(dto)).toEqual({
      id: 'uuid-1',
      fullName: 'Alice Costa',
      email: 'alice@example.com',
      role: UserRole.DOCTOR,
    })
  })
})
