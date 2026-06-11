import { toClinicModel } from './to-clinic-model'

const makeAddress = () => ({
  street: 'Rua das Flores',
  number: '123',
  complement: null as string | null,
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
  country: 'BR',
})

const makeDto = (overrides: object = {}) => ({
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  address: makeAddress(),
  createdAt: '2024-01-15T10:00:00.000Z' as unknown as Date,
  updatedAt: '2024-01-16T10:00:00.000Z' as unknown as Date,
  ...overrides,
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
    const model = toClinicModel(makeDto({ isActive: false }))

    expect(model.isActive).toBe(false)
  })

  it('preserves id, name and slug from dto', () => {
    const model = toClinicModel(makeDto({ id: 'other-uuid', name: 'Outra Clínica', slug: 'outra-clinica' }))

    expect(model.id).toBe('other-uuid')
    expect(model.name).toBe('Outra Clínica')
    expect(model.slug).toBe('outra-clinica')
  })

  it('maps address fields when address is present', () => {
    const model = toClinicModel(makeDto())

    expect(model.address).not.toBeNull()
    expect(model.address?.street).toBe('Rua das Flores')
    expect(model.address?.number).toBe('123')
    expect(model.address?.complement).toBeNull()
    expect(model.address?.neighborhood).toBe('Centro')
    expect(model.address?.city).toBe('São Paulo')
    expect(model.address?.state).toBe('SP')
    expect(model.address?.zipCode).toBe('01310-100')
    expect(model.address?.country).toBe('BR')
  })

  it('maps address complement when provided', () => {
    const model = toClinicModel(makeDto({ address: { ...makeAddress(), complement: 'Apto 42' } }))

    expect(model.address?.complement).toBe('Apto 42')
  })

  it('returns address as null when dto address is null', () => {
    const model = toClinicModel(makeDto({ address: null }))

    expect(model.address).toBeNull()
  })
})
