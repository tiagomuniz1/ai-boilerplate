import { UserRole } from '@app/shared'
import { toUpdateUserDto } from './to-update-user-dto.mapper'

describe('toUpdateUserDto', () => {
  it('maps all provided fields including isActive', () => {
    const input = {
      fullName: 'Alice Updated',
      email: 'updated@example.com',
      role: UserRole.ADMIN,
      isActive: false,
    }

    const dto = toUpdateUserDto(input)

    expect(dto).toEqual({
      fullName: 'Alice Updated',
      email: 'updated@example.com',
      role: UserRole.ADMIN,
      isActive: false,
    })
  })

  it('maps isActive: true correctly', () => {
    const dto = toUpdateUserDto({ isActive: true })

    expect(dto.isActive).toBe(true)
  })

  it('maps partial input leaving undefined fields as undefined', () => {
    const input = { fullName: 'Alice Updated' }

    const dto = toUpdateUserDto(input)

    expect(dto.fullName).toBe('Alice Updated')
    expect(dto.email).toBeUndefined()
    expect(dto.role).toBeUndefined()
    expect(dto.isActive).toBeUndefined()
  })

  it('maps empty input', () => {
    const dto = toUpdateUserDto({})

    expect(dto).toEqual({ fullName: undefined, email: undefined, role: undefined, isActive: undefined })
  })
})
