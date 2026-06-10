import { UserRole } from '@app/shared'
import { toCreateUserDto } from './to-create-user-dto.mapper'

describe('toCreateUserDto', () => {
  it('maps ICreateUserInput to CreateUserDto without clinicId', () => {
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
    expect(dto).not.toHaveProperty('clinicId')
  })

  it('includes clinicId in DTO when provided in input', () => {
    const input = {
      fullName: 'Alice Costa',
      email: 'alice@example.com',
      password: 'password123',
      role: UserRole.ADMIN,
      clinicId: 'clinic-uuid-1',
    }

    const dto = toCreateUserDto(input)

    expect(dto.clinicId).toBe('clinic-uuid-1')
  })
})
