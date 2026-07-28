import { CouncilType, UserRole } from '@app/shared'
import { toUserModel } from './to-user-model.mapper'

describe('toUserModel', () => {
  const dto = {
    id: 'uuid-1',
    fullName: 'Alice Costa',
    email: 'alice@example.com',
    role: UserRole.USER,
    isActive: true,
    isProfessional: false,
    isPatient: false,
    councilType: null,
    createdAt: '2024-01-15T10:00:00.000Z' as unknown as Date,
    updatedAt: '2024-01-16T10:00:00.000Z' as unknown as Date,
  }

  it('maps all fields correctly', () => {
    const model = toUserModel(dto)

    expect(model.id).toBe('uuid-1')
    expect(model.fullName).toBe('Alice Costa')
    expect(model.email).toBe('alice@example.com')
    expect(model.role).toBe(UserRole.USER)
    expect(model.isActive).toBe(true)
  })

  it('maps isActive false', () => {
    const model = toUserModel({ ...dto, isActive: false })
    expect(model.isActive).toBe(false)
  })

  it('maps councilType when present', () => {
    const model = toUserModel({ ...dto, isProfessional: true, councilType: CouncilType.CRN })
    expect(model.councilType).toBe(CouncilType.CRN)
  })

  it('maps councilType to null when absent from the dto', () => {
    const { councilType: _councilType, ...dtoWithoutCouncilType } = dto
    const model = toUserModel(dtoWithoutCouncilType)
    expect(model.councilType).toBeNull()
  })

  it('converts createdAt string to Date instance', () => {
    const model = toUserModel(dto)

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z')
  })

  it('converts updatedAt string to Date instance', () => {
    const model = toUserModel(dto)

    expect(model.updatedAt).toBeInstanceOf(Date)
    expect(model.updatedAt.toISOString()).toBe('2024-01-16T10:00:00.000Z')
  })
})
