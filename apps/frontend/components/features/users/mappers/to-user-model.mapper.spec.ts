import { UserRole } from '@app/shared'
import { toUserModel } from './to-user-model.mapper'

describe('toUserModel', () => {
  const dto = {
    id: 'uuid-1',
    fullName: 'Alice Costa',
    email: 'alice@example.com',
    role: UserRole.USER,
    createdAt: '2024-01-15T10:00:00.000Z' as unknown as Date,
    updatedAt: '2024-01-16T10:00:00.000Z' as unknown as Date,
  }

  it('maps all fields correctly', () => {
    const model = toUserModel(dto)

    expect(model.id).toBe('uuid-1')
    expect(model.fullName).toBe('Alice Costa')
    expect(model.email).toBe('alice@example.com')
    expect(model.role).toBe(UserRole.USER)
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
