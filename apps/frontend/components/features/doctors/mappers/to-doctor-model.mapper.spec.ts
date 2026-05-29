import { toDoctorModel } from './to-doctor-model.mapper'

const makeDto = () => ({
  id: 'uuid-1',
  user: {
    id: 'user-uuid-1',
    fullName: 'Dr. João Silva',
    email: 'joao@example.com',
  },
  crmNumber: '12345/SP',
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia' }],
  bio: 'Especialista em cardiologia intervencionista.',
  createdAt: '2024-01-15T10:00:00.000Z' as unknown as Date,
  updatedAt: '2024-01-16T10:00:00.000Z' as unknown as Date,
})

describe('toDoctorModel', () => {
  it('maps all fields correctly', () => {
    const model = toDoctorModel(makeDto())

    expect(model.id).toBe('uuid-1')
    expect(model.user.id).toBe('user-uuid-1')
    expect(model.user.fullName).toBe('Dr. João Silva')
    expect(model.user.email).toBe('joao@example.com')
    expect(model.crmNumber).toBe('12345/SP')
    expect(model.specialties).toEqual([{ id: 'spec-uuid-1', name: 'Cardiologia' }])
    expect(model.bio).toBe('Especialista em cardiologia intervencionista.')
  })

  it('converts createdAt string to Date instance', () => {
    const model = toDoctorModel(makeDto())

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z')
  })

  it('converts updatedAt string to Date instance', () => {
    const model = toDoctorModel(makeDto())

    expect(model.updatedAt).toBeInstanceOf(Date)
    expect(model.updatedAt.toISOString()).toBe('2024-01-16T10:00:00.000Z')
  })

  it('maps bio as null when null', () => {
    const model = toDoctorModel({ ...makeDto(), bio: null })

    expect(model.bio).toBeNull()
  })

  it('maps user object correctly', () => {
    const model = toDoctorModel(makeDto())

    expect(model.user).toEqual({
      id: 'user-uuid-1',
      fullName: 'Dr. João Silva',
      email: 'joao@example.com',
    })
  })

  it('maps multiple specialties correctly', () => {
    const dto = {
      ...makeDto(),
      specialties: [
        { id: 'spec-uuid-1', name: 'Cardiologia' },
        { id: 'spec-uuid-2', name: 'Neurologia' },
      ],
    }

    const model = toDoctorModel(dto)

    expect(model.specialties).toHaveLength(2)
    expect(model.specialties[1].name).toBe('Neurologia')
  })

  it('maps empty specialties array correctly', () => {
    const model = toDoctorModel({ ...makeDto(), specialties: [] })

    expect(model.specialties).toEqual([])
  })
})
