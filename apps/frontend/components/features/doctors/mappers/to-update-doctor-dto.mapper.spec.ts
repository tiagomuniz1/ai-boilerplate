import { toUpdateDoctorDto } from './to-update-doctor-dto.mapper'

describe('toUpdateDoctorDto', () => {
  it('maps all fields to DTO correctly', () => {
    const input = {
      crms: [{ number: '12345', state: 'SP', isPrimary: true }],
      specialties: [{ specialtyId: 'spec-uuid-1', rqe: '6789' }],
      bio: 'Bio atualizada.',
      isActive: false,
    }

    const dto = toUpdateDoctorDto(input)

    expect(dto.crms).toEqual(input.crms)
    expect(dto.specialties).toEqual(input.specialties)
    expect(dto.bio).toBe(input.bio)
    expect(dto.isActive).toBe(false)
  })

  it('maps undefined fields correctly', () => {
    const dto = toUpdateDoctorDto({})

    expect(dto.crms).toBeUndefined()
    expect(dto.specialties).toBeUndefined()
    expect(dto.bio).toBeUndefined()
    expect(dto.isActive).toBeUndefined()
  })

  it('maps partial update correctly', () => {
    const dto = toUpdateDoctorDto({ specialties: [{ specialtyId: 'spec-uuid-2' }] })

    expect(dto.specialties).toEqual([{ specialtyId: 'spec-uuid-2' }])
    expect(dto.crms).toBeUndefined()
  })
})
