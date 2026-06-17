import { toClinicSpecialtyModel } from './to-clinic-specialty-model.mapper'

const makeDto = () => ({
  id: 'link-uuid-1',
  clinicId: 'clinic-uuid-1',
  specialtyId: 'specialty-uuid-1',
  name: 'Cardiologia',
  description: 'Doenças cardiovasculares',
  linkedAt: '2024-01-15T10:00:00.000Z' as unknown as Date,
})

describe('toClinicSpecialtyModel', () => {
  it('maps all fields correctly', () => {
    const dto = makeDto()
    const model = toClinicSpecialtyModel(dto)

    expect(model.id).toBe(dto.id)
    expect(model.clinicId).toBe(dto.clinicId)
    expect(model.specialtyId).toBe(dto.specialtyId)
    expect(model.name).toBe(dto.name)
    expect(model.description).toBe(dto.description)
    expect(model.linkedAt).toBeInstanceOf(Date)
    expect(model.linkedAt.toISOString()).toBe('2024-01-15T10:00:00.000Z')
  })

  it('maps null description', () => {
    const dto = { ...makeDto(), description: null }
    const model = toClinicSpecialtyModel(dto)

    expect(model.description).toBeNull()
  })
})
