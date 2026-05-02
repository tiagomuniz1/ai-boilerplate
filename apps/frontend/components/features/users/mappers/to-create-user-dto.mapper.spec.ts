import { UserRole } from '@app/shared'
import { toCreateUserDto } from './to-create-user-dto.mapper'

describe('toCreateUserDto', () => {
  it('maps ICreateUserInput to CreateUserDto', () => {
    const input = {
      fullName: 'Alice Costa',
      email: 'alice@example.com',
      password: 'password123',
      role: UserRole.ADMIN,
    }

    const dto = toCreateUserDto(input)

    expect(dto).toEqual({
      fullName: 'Alice Costa',
      email: 'alice@example.com',
      password: 'password123',
      role: UserRole.ADMIN,
    })
  })
})
