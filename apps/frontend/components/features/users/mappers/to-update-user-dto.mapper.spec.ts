import { UserRole } from '@app/shared'
import { toUpdateUserDto } from './to-update-user-dto.mapper'

describe('toUpdateUserDto', () => {
  it('maps all provided fields', () => {
    const input = {
      fullName: 'Alice Updated',
      email: 'updated@example.com',
      role: UserRole.ADMIN,
    }

    const dto = toUpdateUserDto(input)

    expect(dto).toEqual({
      fullName: 'Alice Updated',
      email: 'updated@example.com',
      role: UserRole.ADMIN,
    })
  })

  it('maps partial input leaving undefined fields as undefined', () => {
    const input = { fullName: 'Alice Updated' }

    const dto = toUpdateUserDto(input)

    expect(dto.fullName).toBe('Alice Updated')
    expect(dto.email).toBeUndefined()
    expect(dto.role).toBeUndefined()
  })

  it('maps empty input', () => {
    const dto = toUpdateUserDto({})

    expect(dto).toEqual({ fullName: undefined, email: undefined, role: undefined })
  })
})
