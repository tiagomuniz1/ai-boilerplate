import { toUpdateDoctorDto } from './to-update-doctor-dto.mapper'

describe('toUpdateDoctorDto', () => {
  it('maps all fields to DTO correctly', () => {
    const input = {
      crmNumber: '12345/SP',
      specialtyIds: ['spec-uuid-1'],
      bio: 'Bio atualizada.',
      isActive: false,
    }

    const dto = toUpdateDoctorDto(input)

    expect(dto.crmNumber).toBe(input.crmNumber)
    expect(dto.specialtyIds).toEqual(input.specialtyIds)
    expect(dto.bio).toBe(input.bio)
    expect(dto.isActive).toBe(false)
  })

  it('maps undefined fields correctly', () => {
    const dto = toUpdateDoctorDto({})

    expect(dto.crmNumber).toBeUndefined()
    expect(dto.specialtyIds).toBeUndefined()
    expect(dto.bio).toBeUndefined()
    expect(dto.isActive).toBeUndefined()
  })

  it('maps partial update correctly', () => {
    const dto = toUpdateDoctorDto({ specialtyIds: ['spec-uuid-2'] })

    expect(dto.specialtyIds).toEqual(['spec-uuid-2'])
    expect(dto.crmNumber).toBeUndefined()
  })
})
