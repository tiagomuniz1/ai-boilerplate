import { toClinicModel } from './to-clinic-model'

const makeDto = () => ({
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z' as unknown as Date,
  updatedAt: '2024-01-16T10:00:00.000Z' as unknown as Date,
})

describe('toClinicModel', () => {
  it('maps all fields correctly', () => {
    const model = toClinicModel(makeDto())

    expect(model.id).toBe('uuid-1')
    expect(model.name).toBe('Clínica do Coração')
    expect(model.slug).toBe('clinica-do-coracao')
    expect(model.isActive).toBe(true)
  })

  it('converts createdAt string to Date instance', () => {
    const model = toClinicModel(makeDto())

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z')
  })

  it('converts updatedAt string to Date instance', () => {
    const model = toClinicModel(makeDto())

    expect(model.updatedAt).toBeInstanceOf(Date)
    expect(model.updatedAt.toISOString()).toBe('2024-01-16T10:00:00.000Z')
  })

  it('maps isActive as true when clinic is active', () => {
    const model = toClinicModel(makeDto())

    expect(model.isActive).toBe(true)
  })

  it('maps isActive as false when clinic is inactive', () => {
    const model = toClinicModel({ ...makeDto(), isActive: false })

    expect(model.isActive).toBe(false)
  })

  it('preserves id, name and slug from dto', () => {
    const dto = { ...makeDto(), id: 'other-uuid', name: 'Outra Clínica', slug: 'outra-clinica' }
    const model = toClinicModel(dto)

    expect(model.id).toBe('other-uuid')
    expect(model.name).toBe('Outra Clínica')
    expect(model.slug).toBe('outra-clinica')
  })
})
