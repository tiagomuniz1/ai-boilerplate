import { toUpdateProfessionalDto } from './to-update-professional-dto.mapper'

describe('toUpdateProfessionalDto', () => {
  it('maps all fields to DTO correctly', () => {
    const input = {
      registrations: [{ number: '12345', state: 'SP', isPrimary: true }],
      specialties: [{ specialtyId: 'spec-uuid-1', registryNumber: '6789' }],
      bio: 'Bio atualizada.',
      isActive: false,
    }

    const dto = toUpdateProfessionalDto(input)

    expect(dto.registrations).toEqual(input.registrations)
    expect(dto.specialties).toEqual(input.specialties)
    expect(dto.bio).toBe(input.bio)
    expect(dto.isActive).toBe(false)
  })

  it('maps undefined fields correctly', () => {
    const dto = toUpdateProfessionalDto({})

    expect(dto.registrations).toBeUndefined()
    expect(dto.specialties).toBeUndefined()
    expect(dto.bio).toBeUndefined()
    expect(dto.isActive).toBeUndefined()
  })

  it('maps partial update correctly', () => {
    const dto = toUpdateProfessionalDto({ specialties: [{ specialtyId: 'spec-uuid-2' }] })

    expect(dto.specialties).toEqual([{ specialtyId: 'spec-uuid-2' }])
    expect(dto.registrations).toBeUndefined()
  })
})
