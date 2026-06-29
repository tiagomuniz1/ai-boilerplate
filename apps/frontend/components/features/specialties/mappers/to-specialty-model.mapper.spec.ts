import { toSpecialtyModel } from './to-specialty-model.mapper'

const makeDto = () => ({
  id: 'uuid-1',
  name: 'Cardiologia',
  description: 'Especialidade do coração',
  clinicCount: 2,
  createdAt: '2024-01-15T10:00:00.000Z' as unknown as Date,
  updatedAt: '2024-01-16T10:00:00.000Z' as unknown as Date,
})

describe('toSpecialtyModel', () => {
  it('maps all fields correctly', () => {
    const model = toSpecialtyModel(makeDto())

    expect(model.id).toBe('uuid-1')
    expect(model.name).toBe('Cardiologia')
    expect(model.description).toBe('Especialidade do coração')
    expect(model.clinicCount).toBe(2)
  })

  it('converts createdAt string to Date instance', () => {
    const model = toSpecialtyModel(makeDto())

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z')
  })

  it('converts updatedAt string to Date instance', () => {
    const model = toSpecialtyModel(makeDto())

    expect(model.updatedAt).toBeInstanceOf(Date)
    expect(model.updatedAt.toISOString()).toBe('2024-01-16T10:00:00.000Z')
  })

  it('maps description as null when null', () => {
    const model = toSpecialtyModel({ ...makeDto(), description: null })

    expect(model.description).toBeNull()
  })
})
