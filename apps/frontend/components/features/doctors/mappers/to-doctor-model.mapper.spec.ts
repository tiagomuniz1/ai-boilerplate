import { toDoctorModel } from './to-doctor-model.mapper'

const makeDto = () => ({
  id: 'uuid-1',
  user: {
    id: 'user-uuid-1',
    fullName: 'Dr. João Silva',
    email: 'joao@example.com',
    isActive: true,
  },
  crms: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', rqe: '6789' }],
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
    expect(model.crms).toEqual([{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }])
    expect(model.specialties).toEqual([{ id: 'spec-uuid-1', name: 'Cardiologia', rqe: '6789' }])
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

  it('maps user object correctly including isActive', () => {
    const model = toDoctorModel(makeDto())

    expect(model.user).toEqual({
      id: 'user-uuid-1',
      fullName: 'Dr. João Silva',
      email: 'joao@example.com',
      isActive: true,
    })
  })

  it('maps user.isActive as false when user is inactive', () => {
    const model = toDoctorModel({ ...makeDto(), user: { ...makeDto().user, isActive: false } })

    expect(model.user.isActive).toBe(false)
  })

  it('maps specialty rqe as null when null', () => {
    const model = toDoctorModel({
      ...makeDto(),
      specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', rqe: null }],
    })

    expect(model.specialties[0].rqe).toBeNull()
  })

  it('maps multiple crms preserving the primary flag', () => {
    const dto = {
      ...makeDto(),
      crms: [
        { id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true },
        { id: 'crm-uuid-2', number: '54321', state: 'RJ', isPrimary: false },
      ],
    }

    const model = toDoctorModel(dto)

    expect(model.crms).toHaveLength(2)
    expect(model.crms[1]).toEqual({ id: 'crm-uuid-2', number: '54321', state: 'RJ', isPrimary: false })
  })

  it('maps multiple specialties correctly', () => {
    const dto = {
      ...makeDto(),
      specialties: [
        { id: 'spec-uuid-1', name: 'Cardiologia', rqe: '6789' },
        { id: 'spec-uuid-2', name: 'Neurologia', rqe: null },
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
