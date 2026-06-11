import { UserRole } from '@app/shared'
import { toAuthUserModel } from './to-auth-user-model'

const CLINIC_ID = 'clinic-uuid-1'

describe('toAuthUserModel', () => {
  it('maps IAuthUserDto to IAuthUserModel including role and clinicId', () => {
    const dto = {
      id: 'uuid-1',
      fullName: 'Alice Costa',
      email: 'alice@example.com',
      role: UserRole.DOCTOR,
      clinicId: CLINIC_ID,
    }
    expect(toAuthUserModel(dto)).toEqual({
      id: 'uuid-1',
      fullName: 'Alice Costa',
      email: 'alice@example.com',
      role: UserRole.DOCTOR,
      clinicId: CLINIC_ID,
    })
  })

  it('maps clinicId correctly from dto', () => {
    const dto = {
      id: 'uuid-2',
      fullName: 'Bob Silva',
      email: 'bob@example.com',
      role: UserRole.ADMIN,
      clinicId: 'clinic-uuid-2',
    }
    const result = toAuthUserModel(dto)
    expect(result.clinicId).toBe('clinic-uuid-2')
  })

  it('maps clinicId as null for PLATFORM_ADMIN', () => {
    const dto = {
      id: 'uuid-3',
      fullName: 'Platform Admin',
      email: 'platform@example.com',
      role: UserRole.PLATFORM_ADMIN,
      clinicId: null,
    }
    const result = toAuthUserModel(dto)
    expect(result.clinicId).toBeNull()
  })
})
